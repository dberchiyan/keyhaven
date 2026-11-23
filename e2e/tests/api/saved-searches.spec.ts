import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { type ApiResponse, type Client, ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD } from '../../support/db';
import { allEmails, emailAfter, emailCount, quietPeriod } from '../../support/mailbox';

/** The backend's MAX_SAVED_SEARCHES (DATA-8): the list is unpaged, so a tenant keeps at most this many. */
const MAX_SAVED_SEARCHES = 20;

const rows = (response: ApiResponse): Record<string, unknown>[] =>
    (response.body.content as Record<string, unknown>[] | undefined) ?? [];
const idsOf = (response: ApiResponse): unknown[] => rows(response).map((row) => row.id);

test.describe.configure({ mode: 'serial' });

test.describe('Saved searches and the daily digest', () => {
    const clients = new ClientPool();
    let f: Fixtures;
    let tenant: Client;
    let otherTenant: Client;
    let landlord: Client;
    let admin: Client;
    let visitor: Client;
    let searchId = '';
    let version = 0;

    const search = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
        name: 'Pet-friendly in Testville',
        hasEmailAlerts: true,
        criteria: { kind: 'RENT', city: 'testville', isPetFriendly: true },
        ...overrides,
    });

    test.beforeAll(async () => {
        f = await createFixtures(`saved-${randomUUID().slice(0, 8)}`);
        tenant = await clients.signedIn(f.tenant.email, PASSWORD);
        otherTenant = await clients.signedIn(f.otherTenant.email, PASSWORD);
        landlord = await clients.signedIn(f.landlord.email, PASSWORD);
        admin = await clients.signedIn(f.admin.email, PASSWORD);
        visitor = await clients.open();
    });

    test.afterAll(async () => {
        await clients.disposeAll();
    });

    test('a tenant saves a search once per Idempotency-Key and sees it in their list', async () => {
        const key = randomUUID();
        const created = await tenant.postIdempotent('/api/v1/saved-searches', search(), key);
        expect(created.status).toBe(200);
        expect(created.body).toMatchObject({
            name: 'Pet-friendly in Testville',
            hasEmailAlerts: true,
            criteria: { kind: 'RENT', city: 'testville', isPetFriendly: true },
            lastNotifiedAt: null,
            version: 0,
        });
        searchId = String(created.body.id);

        const retried = await tenant.postIdempotent('/api/v1/saved-searches', search(), key);
        expect(retried.status).toBe(200);
        expect(retried.body.id).toBe(searchId);
        const reused = await tenant.postIdempotent('/api/v1/saved-searches', search({ name: 'Something else' }), key);
        expect(reused.status).toBe(409);

        const list = await tenant.get('/api/v1/saved-searches');
        expect(list.status).toBe(200);
        expect(idsOf(list)).toEqual([searchId]);
    });

    test('names the field that fails validation', async () => {
        const noName = await tenant.postIdempotent('/api/v1/saved-searches', search({ name: '  ' }));
        expect(noName.status).toBe(400);
        expect(noName.body).toMatchObject({ error: 'VALIDATION_FAILED', details: [{ field: 'name' }] });

        const noFlag = await tenant.postIdempotent('/api/v1/saved-searches', search({ hasEmailAlerts: 'yes' }));
        expect(noFlag.status).toBe(400);
        expect(noFlag.body).toMatchObject({ details: [{ field: 'hasEmailAlerts' }] });

        const badCity = await tenant.postIdempotent(
            '/api/v1/saved-searches',
            search({ criteria: { city: 'Not A Slug' } }),
        );
        expect(badCity.status).toBe(400);
        expect(badCity.body).toMatchObject({ details: [{ field: 'criteria.city' }] });

        const noVersion = await tenant.put(`/api/v1/saved-searches/${searchId}`, {
            name: 'Renamed',
            hasEmailAlerts: true,
        });
        expect(noVersion.status).toBe(400);
        expect(noVersion.body).toMatchObject({ details: [{ field: 'version' }] });
    });

    test('renames with an optimistic lock: a stale version is a conflict', async () => {
        const renamed = await tenant.put(`/api/v1/saved-searches/${searchId}`, {
            name: 'Testville with a dog',
            hasEmailAlerts: true,
            version,
        });
        expect(renamed.status).toBe(200);
        expect(renamed.body).toMatchObject({ name: 'Testville with a dog', version: version + 1 });
        version = Number(renamed.body.version);

        const stale = await tenant.put(`/api/v1/saved-searches/${searchId}`, {
            name: 'Lost update',
            hasEmailAlerts: false,
            version: version - 1,
        });
        expect(stale.status).toBe(409);
        expect(stale.body).toMatchObject({ error: 'CONCURRENT_MODIFICATION' });
        expect(rows(await tenant.get('/api/v1/saved-searches'))[0]).toMatchObject({ name: 'Testville with a dog' });
    });

    test('only the tenant who saved it reads or changes it; others are refused, visitors are 401', async () => {
        const change = { name: 'Taken over', hasEmailAlerts: false, version };
        expect((await otherTenant.put(`/api/v1/saved-searches/${searchId}`, change)).status).toBe(403);
        expect((await otherTenant.delete(`/api/v1/saved-searches/${searchId}`)).status).toBe(403);
        expect(idsOf(await otherTenant.get('/api/v1/saved-searches'))).not.toContain(searchId);

        expect((await landlord.get('/api/v1/saved-searches')).status).toBe(403);
        expect((await landlord.postIdempotent('/api/v1/saved-searches', search())).status).toBe(403);
        expect((await admin.get('/api/v1/saved-searches')).status).toBe(403);
        expect((await admin.put(`/api/v1/saved-searches/${searchId}`, change)).status).toBe(403);
        expect((await admin.delete(`/api/v1/saved-searches/${searchId}`)).status).toBe(403);

        expect((await visitor.get('/api/v1/saved-searches')).status).toBe(401);
        expect((await visitor.put(`/api/v1/saved-searches/${searchId}`, change)).status).toBe(401);
        expect((await visitor.delete(`/api/v1/saved-searches/${searchId}`)).status).toBe(401);
        expect((await visitor.post('/api/v1/saved-search-digests')).status).toBe(401);

        expect(rows(await tenant.get('/api/v1/saved-searches'))[0]).toMatchObject({ name: 'Testville with a dog' });
    });

    test(`keeps at most ${String(MAX_SAVED_SEARCHES)} searches a tenant`, async () => {
        for (let index = 0; index < MAX_SAVED_SEARCHES; index += 1) {
            const created = await otherTenant.postIdempotent(
                '/api/v1/saved-searches',
                search({ name: `Quiet search ${String(index)}`, hasEmailAlerts: false }),
            );
            expect(created.status).toBe(200);
        }
        const refused = await otherTenant.postIdempotent('/api/v1/saved-searches', search({ hasEmailAlerts: false }));
        expect(refused.status).toBe(422);
        expect(refused.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });
        expect(rows(await otherTenant.get('/api/v1/saved-searches'))).toHaveLength(MAX_SAVED_SEARCHES);
    });

    test('the digest mails a home published since, once; a search without alerts gets nothing', async () => {
        expect((await tenant.post('/api/v1/saved-search-digests')).status).toBe(403);
        expect((await landlord.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`)).status).toBe(200);

        const before = await emailCount();
        const sent = await admin.post('/api/v1/saved-search-digests');
        expect(sent.status).toBe(200);
        expect(sent.body.emails).toBeGreaterThanOrEqual(1);
        const mail = await emailAfter(f.tenant.email, before);
        expect(mail.subject).toContain('Testville with a dog');
        expect(mail.text).toContain(`/listings/${f.landlordDraft}`);
        expect(mail.text).not.toContain(`/listings/${f.landlordPublished}`);
        expect(typeof rows(await tenant.get('/api/v1/saved-searches'))[0]?.lastNotifiedAt).toBe('string');

        const again = await admin.post('/api/v1/saved-search-digests');
        expect(again.status).toBe(200);
        await quietPeriod();
        const sinceBefore = (await allEmails()).slice(before);
        expect(sinceBefore.filter((message) => message.to.includes(f.tenant.email))).toHaveLength(1);
        expect(sinceBefore.filter((message) => message.to.includes(f.otherTenant.email))).toHaveLength(0);
    });

    test('deletes a search; it is gone from the list and cannot be deleted twice', async () => {
        expect((await tenant.delete(`/api/v1/saved-searches/${searchId}`)).status).toBe(204);
        expect(idsOf(await tenant.get('/api/v1/saved-searches'))).not.toContain(searchId);
        expect((await tenant.delete(`/api/v1/saved-searches/${searchId}`)).status).toBe(403);
    });
});
