import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { type Client, ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD, scalar, withDb } from '../../support/db';

const hours = {
    slotMinutes: 30,
    noticeHours: 0,
    horizonDays: 14,
    windows: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: 8 * 60, end: 20 * 60 })),
    blockedDays: [],
    version: null,
};

interface SlotDay {
    day: string;
    slots: { startsAt: string }[];
}

interface ExportedMessage {
    conversationId: string;
    body: string;
}

/** A `count(*)` read back as a number: node-postgres answers bigint as a string. */
const countOf = (text: string, values: unknown[]): Promise<number> =>
    withDb(async (db) => Number(await scalar<string>(db, text, values)));

test.describe.configure({ mode: 'serial' });

test.describe('Personal data: export and erasure (DATA-23)', () => {
    const clients = new ClientPool();
    let f: Fixtures;
    let tenant: Client;
    let otherTenant: Client;
    let landlord: Client;
    let agent: Client;
    let admin: Client;
    let tenantViewingId = '';
    let otherTenantViewingId = '';

    const firstSlot = async (client: Client, listingId: string, dayIndex: number): Promise<string> => {
        const slots = await client.get(`/api/v1/listings/${listingId}/viewing-slots?days=5`);
        const slot = (slots.body.days as SlotDay[])[dayIndex]?.slots[0];
        if (!slot) {
            throw new Error('No slot to pick');
        }
        return slot.startsAt;
    };

    test.beforeAll(async () => {
        f = await createFixtures(`privacy-${randomUUID().slice(0, 8)}`);
        tenant = await clients.signedIn(f.tenant.email, PASSWORD);
        otherTenant = await clients.signedIn(f.otherTenant.email, PASSWORD);
        landlord = await clients.signedIn(f.landlord.email, PASSWORD);
        agent = await clients.signedIn(f.agent.email, PASSWORD);
        admin = await clients.signedIn(f.admin.email, PASSWORD);

        expect(
            (await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, hours)).status,
        ).toBe(200);
        expect((await agent.put(`/api/v1/managed-listings/${f.agencyPublished}/viewing-schedule`, hours)).status).toBe(
            200,
        );
        const requested = await tenant.postIdempotent('/api/v1/viewings', {
            listingId: f.landlordPublished,
            startsAt: await firstSlot(tenant, f.landlordPublished, 2),
            message: 'Could I bring my dog?',
        });
        expect(requested.status).toBe(200);
        tenantViewingId = String(requested.body.id);
        expect((await landlord.post(`/api/v1/viewings/${tenantViewingId}/confirmation`)).status).toBe(200);
        expect(
            (
                await tenant.postIdempotent(`/api/v1/conversations/${tenantViewingId}/messages`, {
                    body: 'See you on Tuesday',
                })
            ).status,
        ).toBe(200);
        expect((await tenant.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(200);
        expect(
            (
                await tenant.postIdempotent('/api/v1/saved-searches', {
                    name: 'Mine in Testville',
                    hasEmailAlerts: true,
                    criteria: { city: 'testville' },
                })
            ).status,
        ).toBe(200);

        expect(
            (
                await otherTenant.postIdempotent('/api/v1/saved-searches', {
                    name: 'Someone else',
                    hasEmailAlerts: false,
                    criteria: { city: 'testville' },
                })
            ).status,
        ).toBe(200);
        const otherAgency = await otherTenant.postIdempotent('/api/v1/viewings', {
            listingId: f.agencyPublished,
            startsAt: await firstSlot(otherTenant, f.agencyPublished, 3),
        });
        expect(otherAgency.status).toBe(200);
        const otherLandlords = await otherTenant.postIdempotent('/api/v1/viewings', {
            listingId: f.landlordPublished,
            startsAt: await firstSlot(otherTenant, f.landlordPublished, 4),
        });
        expect(otherLandlords.status).toBe(200);
        otherTenantViewingId = String(otherLandlords.body.id);
    });

    test.afterAll(async () => {
        await clients.disposeAll();
    });

    test('exports only the caller’s own data', async () => {
        const response = await tenant.get('/api/v1/personal-data');
        expect(response.status).toBe(200);
        const data = response.body;
        expect(data).toMatchObject({
            account: { email: f.tenant.email, role: 'TENANT', agencyName: null },
            savedHomes: [{ listingId: f.landlordPublished }],
            savedSearches: [{ name: 'Mine in Testville', hasEmailAlerts: true }],
            viewings: [{ status: 'CONFIRMED', message: 'Could I bring my dog?' }],
            messagesWritten: [{ conversationId: tenantViewingId, body: 'See you on Tuesday' }],
            conversationsOpened: [],
            listings: [],
        });
        expect((data.sessions as unknown[]).length).toBeGreaterThan(0);
        expect(data.securityLog).toEqual(
            expect.arrayContaining([expect.objectContaining({ action: 'auth.signed_in' })]),
        );
        expect(JSON.stringify(data)).not.toContain('Someone else');
        expect(data.viewings).toHaveLength(1);

        const landlordData = (await landlord.get('/api/v1/personal-data')).body;
        expect((landlordData.listings as { id: string }[]).map((listing) => listing.id)).toContain(f.landlordPublished);
        expect(landlordData.viewings).toEqual([]);
    });

    test('needs a session', async () => {
        expect((await (await clients.open()).get('/api/v1/personal-data')).status).toBe(401);
        expect(
            (await (await clients.open()).post('/api/v1/personal-data/erasure', { password: PASSWORD })).status,
        ).toBe(401);
    });

    test('refuses a wrong password on the field, and staff accounts', async () => {
        const wrong = await tenant.post('/api/v1/personal-data/erasure', { password: 'Not-The-Password-1!' });
        expect(wrong.status).toBe(422);
        expect(wrong.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION', details: [{ field: 'password' }] });
        const empty = await tenant.post('/api/v1/personal-data/erasure', { password: '' });
        expect(empty.status).toBe(400);

        const staff = await admin.post('/api/v1/personal-data/erasure', { password: PASSWORD });
        expect(staff.status).toBe(422);
        expect(staff.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });
        expect((await admin.get('/api/v1/auth/me')).status).toBe(200);
    });

    test('erases a tenant: signed out, anonymised, data gone, viewing cancelled, messages removed', async () => {
        const erased = await tenant.post('/api/v1/personal-data/erasure', { password: PASSWORD });
        expect(erased.status).toBe(200);
        expect((await tenant.get('/api/v1/auth/me')).status).toBe(401);
        expect((await (await clients.open()).login(f.tenant.email, PASSWORD)).status).toBe(401);

        const user = await withDb(async (db) => {
            const result = await db.query(
                `SELECT first_name AS "firstName", last_name AS "lastName", email, phone,
                        email_verified_at AS "emailVerifiedAt"
                 FROM users WHERE id = $1`,
                [f.tenant.id],
            );
            return result.rows[0] as unknown;
        });
        expect(user).toEqual({
            firstName: 'Deleted',
            lastName: 'account',
            email: `erased-${f.tenant.id}@erased.keyhaven.invalid`,
            phone: null,
            emailVerifiedAt: null,
        });
        expect(await countOf('SELECT count(*) FROM sessions WHERE user_id = $1', [f.tenant.id])).toBe(0);
        expect(await countOf('SELECT count(*) FROM saved_searches WHERE user_id = $1', [f.tenant.id])).toBe(0);
        expect(await countOf('SELECT count(*) FROM saved_listings WHERE user_id = $1', [f.tenant.id])).toBe(0);
        expect(await countOf('SELECT count(*) FROM saved_searches WHERE user_id = $1', [f.otherTenant.id])).toBe(1);

        const viewing = (await landlord.get(`/api/v1/viewings/${tenantViewingId}`)).body;
        expect(viewing).toMatchObject({ status: 'CANCELLED', cancelledBy: 'TENANT', message: null });

        const thread = (await landlord.get(`/api/v1/conversations/${tenantViewingId}/messages`)).body;
        expect(thread.messages).toEqual([expect.objectContaining({ isRemoved: true, body: '' })]);
        expect(thread.lastMessage).toMatchObject({ isRemoved: true, body: '' });
        const written = await withDb(
            async (db) =>
                (
                    await db.query(
                        'SELECT conversation_id AS "conversationId", body FROM messages WHERE sender_id = $1',
                        [f.tenant.id],
                    )
                ).rows as ExportedMessage[],
        );
        expect(written.every((message: ExportedMessage) => message.body === '')).toBe(true);

        expect(
            await countOf(
                `SELECT count(*) FROM audit_events WHERE action = 'user.erased' AND target_id = $1 AND actor_user_id = $1 AND subject_id IS NULL`,
                [f.tenant.id],
            ),
        ).toBe(1);
        expect(
            await countOf(
                `SELECT count(*) FROM audit_events WHERE action = 'viewing.cancelled' AND target_id = $1
                   AND subject_id = (SELECT listing_id FROM viewings WHERE id = $1)`,
                [tenantViewingId],
            ),
        ).toBe(1);
    });

    test('erases a landlord: published homes unpublished, live viewings on them cancelled by the owner', async () => {
        const erased = await landlord.post('/api/v1/personal-data/erasure', { password: PASSWORD });
        expect(erased.status).toBe(200);
        expect((await landlord.get('/api/v1/auth/me')).status).toBe(401);

        const status = await withDb((db) =>
            scalar<string>(db, 'SELECT status FROM listings WHERE id = $1', [f.landlordPublished]),
        );
        expect(status).toBe('UNPUBLISHED');
        expect(
            await countOf(
                `SELECT count(*) FROM audit_events WHERE action = 'listing.unpublished' AND target_id = $1 AND subject_id = $1`,
                [f.landlordPublished],
            ),
        ).toBe(1);
        expect((await otherTenant.get(`/api/v1/viewings/${otherTenantViewingId}`)).body).toMatchObject({
            status: 'CANCELLED',
            cancelledBy: 'OWNER',
        });
        const agencyViewings = (await otherTenant.get('/api/v1/viewings')).body.content as { status: string }[];
        expect(agencyViewings.some((viewing) => viewing.status === 'REQUESTED')).toBe(true);
    });
});
