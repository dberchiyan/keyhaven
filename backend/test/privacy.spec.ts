import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';

import { PG_SESSION_OPTIONS } from '@/common/persistence/pg-pool';
import { PrismaClient } from '@/generated/prisma/client';

import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';
import { testDatabaseUrl } from './test-database';

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

describe('Personal data: export and erasure (DATA-23)', () => {
    let testApp: TestApp;
    let f: Fixtures;
    let prisma: PrismaClient;
    let tenant: Client;
    let otherTenant: Client;
    let landlord: Client;
    let agent: Client;
    let admin: Client;
    let tenantViewingId = '';
    let otherTenantViewingId = '';

    const firstSlot = async (client: Client, listingId: string, dayIndex: number): Promise<string> => {
        const slots = await client.get(`/api/v1/listings/${listingId}/viewing-slots?days=5`);
        const slot = (bodyOf(slots).days as SlotDay[])[dayIndex]?.slots[0];
        if (!slot) {
            throw new Error('No slot to pick');
        }
        return slot.startsAt;
    };

    beforeAll(async () => {
        testApp = await createTestApp();
        f = await createFixtures(`privacy-${randomUUID().slice(0, 8)}`);
        prisma = new PrismaClient({
            adapter: new PrismaPg({ connectionString: testDatabaseUrl(), options: PG_SESSION_OPTIONS }),
        });
        tenant = new Client(testApp.app);
        otherTenant = new Client(testApp.app);
        landlord = new Client(testApp.app);
        agent = new Client(testApp.app);
        admin = new Client(testApp.app);
        for (const [client, user] of [
            [tenant, f.tenant],
            [otherTenant, f.otherTenant],
            [landlord, f.landlord],
            [agent, f.agent],
            [admin, f.admin],
        ] as const) {
            expect((await client.login(user.email, PASSWORD)).status).toBe(200);
        }

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
        tenantViewingId = String(bodyOf(requested).id);
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
        otherTenantViewingId = String(bodyOf(otherLandlords).id);
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await testApp.close();
    });

    it('exports only the caller’s own data', async () => {
        const response = await tenant.get('/api/v1/personal-data');
        expect(response.status).toBe(200);
        const data = bodyOf(response);
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

        const landlordData = bodyOf(await landlord.get('/api/v1/personal-data'));
        expect((landlordData.listings as { id: string }[]).map((listing) => listing.id)).toContain(f.landlordPublished);
        expect(landlordData.viewings).toEqual([]);
    });

    it('needs a session', async () => {
        expect((await new Client(testApp.app).get('/api/v1/personal-data')).status).toBe(401);
        expect(
            (await new Client(testApp.app).post('/api/v1/personal-data/erasure', { password: PASSWORD })).status,
        ).toBe(401);
    });

    it('refuses a wrong password on the field, and staff accounts', async () => {
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

    it('erases a tenant: signed out, anonymised, data gone, viewing cancelled, messages removed', async () => {
        const erased = await tenant.post('/api/v1/personal-data/erasure', { password: PASSWORD });
        expect(erased.status).toBe(200);
        expect((await tenant.get('/api/v1/auth/me')).status).toBe(401);
        expect((await new Client(testApp.app).login(f.tenant.email, PASSWORD)).status).toBe(401);

        const user = await prisma.user.findUniqueOrThrow({
            where: { id: f.tenant.id },
            select: { firstName: true, lastName: true, email: true, phone: true, emailVerifiedAt: true },
        });
        expect(user).toEqual({
            firstName: 'Deleted',
            lastName: 'account',
            email: `erased-${f.tenant.id}@erased.keyhaven.invalid`,
            phone: null,
            emailVerifiedAt: null,
        });
        expect(await prisma.session.count({ where: { userId: f.tenant.id } })).toBe(0);
        expect(await prisma.savedSearch.count({ where: { userId: f.tenant.id } })).toBe(0);
        expect(await prisma.savedListing.count({ where: { userId: f.tenant.id } })).toBe(0);
        expect(await prisma.savedSearch.count({ where: { userId: f.otherTenant.id } })).toBe(1);

        const viewing = bodyOf(await landlord.get(`/api/v1/viewings/${tenantViewingId}`));
        expect(viewing).toMatchObject({ status: 'CANCELLED', cancelledBy: 'TENANT', message: null });

        const thread = bodyOf(await landlord.get(`/api/v1/conversations/${tenantViewingId}/messages`));
        expect(thread.messages).toEqual([expect.objectContaining({ isRemoved: true, body: '' })]);
        expect(thread.lastMessage).toMatchObject({ isRemoved: true, body: '' });
        const written = await prisma.message.findMany({
            where: { senderId: f.tenant.id },
            select: { conversationId: true, body: true },
        });
        expect(written.every((message: ExportedMessage) => message.body === '')).toBe(true);

        expect(
            await prisma.auditEvent.count({
                where: { action: 'user.erased', targetId: f.tenant.id, actorUserId: f.tenant.id },
            }),
        ).toBe(1);
        expect(
            await prisma.auditEvent.count({ where: { action: 'viewing.cancelled', targetId: tenantViewingId } }),
        ).toBe(1);
    });

    it('erases a landlord: published homes unpublished, live viewings on them cancelled by the owner', async () => {
        const erased = await landlord.post('/api/v1/personal-data/erasure', { password: PASSWORD });
        expect(erased.status).toBe(200);
        expect((await landlord.get('/api/v1/auth/me')).status).toBe(401);

        const listing = await prisma.listing.findUniqueOrThrow({
            where: { id: f.landlordPublished },
            select: { status: true },
        });
        expect(listing.status).toBe('UNPUBLISHED');
        expect(
            await prisma.auditEvent.count({ where: { action: 'listing.unpublished', targetId: f.landlordPublished } }),
        ).toBe(1);
        expect(bodyOf(await otherTenant.get(`/api/v1/viewings/${otherTenantViewingId}`))).toMatchObject({
            status: 'CANCELLED',
            cancelledBy: 'OWNER',
        });
        const agencyViewings = bodyOf(await otherTenant.get('/api/v1/viewings')).content as { status: string }[];
        expect(agencyViewings.some((viewing) => viewing.status === 'REQUESTED')).toBe(true);
    });
});
