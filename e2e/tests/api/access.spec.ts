import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { type Client, ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD } from '../../support/db';

test.describe.configure({ mode: 'serial' });

test.describe('Access by role', () => {
    const clients = new ClientPool();
    let f: Fixtures;
    let tenant: Client;
    let landlord: Client;
    let agent: Client;
    let admin: Client;

    test.beforeAll(async () => {
        f = await createFixtures(`access-${randomUUID().slice(0, 8)}`);
        tenant = await clients.signedIn(f.tenant.email, PASSWORD);
        landlord = await clients.signedIn(f.landlord.email, PASSWORD);
        agent = await clients.signedIn(f.agent.email, PASSWORD);
        admin = await clients.signedIn(f.admin.email, PASSWORD);
    });

    test.afterAll(async () => {
        await clients.disposeAll();
    });

    test.describe('signed out', () => {
        test('answers 401 UNAUTHORIZED without a session — the catalogue excepted', async () => {
            const anonymous = await clients.open();
            const response = await anonymous.get('/api/v1/managed-listings');
            expect(response.status).toBe(401);
            expect(response.body).toMatchObject({ error: 'UNAUTHORIZED' });
            expect((await anonymous.get('/api/v1/listings')).status).toBe(200);
        });

        test('answers INVALID_CREDENTIALS for a wrong password and an unknown email alike', async () => {
            const anonymous = await clients.open();
            const wrong = await anonymous.login(f.tenant.email, 'Wrong-Password-1!');
            const unknown = await anonymous.login(`nobody-${randomUUID()}@test.example`, PASSWORD);
            expect(wrong.status).toBe(401);
            expect(unknown.status).toBe(401);
            expect(wrong.body).toMatchObject({ error: 'INVALID_CREDENTIALS' });
            expect(unknown.body).toMatchObject({ error: 'INVALID_CREDENTIALS' });
        });
    });

    test.describe('every role', () => {
        test('lands on its own account with its role', async () => {
            for (const [client, user, role] of [
                [tenant, f.tenant, 'TENANT'],
                [landlord, f.landlord, 'LANDLORD'],
                [agent, f.agent, 'AGENT'],
                [admin, f.admin, 'ADMIN'],
            ] as const) {
                const response = await client.get('/api/v1/auth/me');
                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({ email: user.email, role });
            }
            const agentProfile = await agent.get('/api/v1/auth/me');
            expect(agentProfile.body).toMatchObject({ agency: { id: f.agencyId } });
        });

        test('sees a published listing without its exact address', async () => {
            const response = await tenant.get(`/api/v1/listings/${f.otherLandlordPublished}`);
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({ address: null, listedBy: { kind: 'LANDLORD' } });
            expect(JSON.stringify(response.body)).not.toContain('Secret St');
        });

        test('cannot see someone else’s unpublished listing — 404, like an unknown id', async () => {
            for (const client of [tenant, landlord, agent]) {
                const response = await client.get(`/api/v1/listings/${f.otherLandlordUnpublished}`);
                expect(response.status).toBe(404);
            }
            expect((await tenant.get(`/api/v1/listings/${randomUUID()}`)).status).toBe(404);
        });

        test('rejects a path id that is not a UUID with 400', async () => {
            const response = await tenant.get('/api/v1/listings/not-a-uuid');
            expect(response.status).toBe(400);
            expect(response.body).toMatchObject({ error: 'INVALID_PARAMETER' });
        });
    });

    test.describe('tenant', () => {
        test('has no listings dashboard (403)', async () => {
            expect((await tenant.get('/api/v1/managed-listings')).status).toBe(403);
            expect((await tenant.get('/api/v1/managed-listings/status-counts')).status).toBe(403);
            expect((await tenant.get(`/api/v1/managed-listings/${f.landlordPublished}`)).status).toBe(403);
        });

        test('cannot publish, unpublish or suspend anything (403)', async () => {
            for (const action of ['publication', 'unpublication', 'suspension']) {
                const response = await tenant.post(`/api/v1/managed-listings/${f.landlordPublished}/${action}`);
                expect(response.status).toBe(403);
                expect(response.body).toMatchObject({ error: 'FORBIDDEN' });
            }
        });
    });

    test.describe('landlord', () => {
        test('lists only their own listings, including drafts', async () => {
            const response = await landlord.get('/api/v1/managed-listings?size=100');
            expect(response.status).toBe(200);
            const ids = (response.body as { content: { id: string }[] }).content.map((item) => item.id);
            expect(ids.sort()).toEqual([f.landlordPublished, f.landlordDraft, f.landlordDemo].sort());
        });

        test('sees their own draft with the exact address', async () => {
            const dashboard = await landlord.get(`/api/v1/managed-listings/${f.landlordDraft}`);
            expect(dashboard.status).toBe(200);
            expect(dashboard.body).toMatchObject({
                status: 'DRAFT',
                address: { line1: '1 Secret St' },
            });
            const page = await landlord.get(`/api/v1/listings/${f.landlordDraft}`);
            expect(page.status).toBe(200);
            expect(page.body).toMatchObject({ address: { line1: '1 Secret St' } });
        });

        test('is refused another landlord’s listing in the dashboard — 403', async () => {
            expect((await landlord.get(`/api/v1/managed-listings/${f.otherLandlordPublished}`)).status).toBe(403);
            expect(
                (await landlord.post(`/api/v1/managed-listings/${f.otherLandlordPublished}/unpublication`)).status,
            ).toBe(403);
            expect((await landlord.get(`/api/v1/managed-listings/${f.agencyDraft}`)).status).toBe(403);
        });

        test('publishes a draft and unpublishes it again; a repeat is a no-op', async () => {
            const published = await landlord.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`);
            expect(published.status).toBe(200);
            expect(published.body).toMatchObject({ status: 'PUBLISHED' });
            expect(typeof published.body.publishedAt).toBe('string');
            const again = await landlord.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`);
            expect(again.status).toBe(200);
            expect(again.body).toMatchObject({ status: 'PUBLISHED', version: published.body.version });
            expect((await tenant.get(`/api/v1/listings/${f.landlordDraft}`)).status).toBe(200);
            const unpublished = await landlord.post(`/api/v1/managed-listings/${f.landlordDraft}/unpublication`);
            expect(unpublished.status).toBe(200);
            expect(unpublished.body).toMatchObject({ status: 'UNPUBLISHED' });
            expect((await tenant.get(`/api/v1/listings/${f.landlordDraft}`)).status).toBe(404);
        });

        test('cannot suspend — that is an admin action (403)', async () => {
            const response = await landlord.post(`/api/v1/managed-listings/${f.landlordPublished}/suspension`);
            expect(response.status).toBe(403);
        });
    });

    test.describe('agent', () => {
        test('lists the agency’s listings only', async () => {
            const response = await agent.get('/api/v1/managed-listings?size=100');
            expect(response.status).toBe(200);
            const ids = (response.body as { content: { id: string }[] }).content.map((item) => item.id);
            expect(ids.sort()).toEqual([f.agencyPublished, f.agencyDraft, f.agencyDemo].sort());
        });

        test('manages the agency’s listings but not a landlord’s (403)', async () => {
            const own = await agent.get(`/api/v1/managed-listings/${f.agencyDraft}`);
            expect(own.status).toBe(200);
            expect(own.body).toMatchObject({ listedBy: { kind: 'AGENCY' } });
            expect((await agent.get(`/api/v1/managed-listings/${f.landlordDraft}`)).status).toBe(403);
            const publish = await agent.post(`/api/v1/managed-listings/${f.agencyDraft}/publication`);
            expect(publish.status).toBe(200);
            expect(publish.body).toMatchObject({ status: 'PUBLISHED' });
        });

        test('is refused another agency’s listing (403)', async () => {
            const otherAgent = await clients.open();
            expect((await otherAgent.login(f.otherAgencyAgent.email, PASSWORD)).status).toBe(200);
            expect((await otherAgent.get(`/api/v1/managed-listings/${f.agencyPublished}`)).status).toBe(403);
            const list = await otherAgent.get('/api/v1/managed-listings?size=100');
            expect(list.body).toMatchObject({ totalElements: 0 });
        });
    });

    test.describe('admin', () => {
        test('sees every listing, foreign drafts included', async () => {
            const list = await admin.get('/api/v1/managed-listings?size=100');
            expect(list.status).toBe(200);
            const ids = (list.body as { content: { id: string }[] }).content.map((item) => item.id);
            expect(ids).toEqual(expect.arrayContaining([f.landlordDraft, f.otherLandlordUnpublished, f.agencyDraft]));
            const draft = await admin.get(`/api/v1/listings/${f.otherLandlordUnpublished}`);
            expect(draft.status).toBe(200);
            expect(draft.body).toMatchObject({ address: { line1: '1 Secret St' } });
        });

        test('suspends a listing; the owner cannot publish it again; a repeat is a no-op', async () => {
            const suspended = await admin.post(`/api/v1/managed-listings/${f.otherLandlordPublished}/suspension`);
            expect(suspended.status).toBe(200);
            expect(suspended.body).toMatchObject({ status: 'SUSPENDED' });
            expect((await tenant.get(`/api/v1/listings/${f.otherLandlordPublished}`)).status).toBe(404);
            const again = await admin.post(`/api/v1/managed-listings/${f.otherLandlordPublished}/suspension`);
            expect(again.status).toBe(200);
            expect(again.body).toMatchObject({ status: 'SUSPENDED', version: suspended.body.version });

            const owner = await clients.open();
            expect((await owner.login(f.otherLandlord.email, PASSWORD)).status).toBe(200);
            const publish = await owner.post(`/api/v1/managed-listings/${f.otherLandlordPublished}/publication`);
            expect(publish.status).toBe(422);
            expect(publish.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });
        });

        test('does not publish on behalf of owners (403) and answers 404 for an unknown id', async () => {
            expect((await admin.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`)).status).toBe(403);
            expect((await admin.get(`/api/v1/managed-listings/${randomUUID()}`)).status).toBe(404);
            expect((await admin.post(`/api/v1/managed-listings/${randomUUID()}/suspension`)).status).toBe(404);
        });
    });

    test.describe('CSRF', () => {
        test('refuses a mutation without the XSRF header', async () => {
            await admin.get('/api/v1/auth/me');
            const fresh = await clients.open();
            await fresh.login(f.admin.email, PASSWORD);
            const response = await fresh.postWithoutCsrf(`/api/v1/managed-listings/${f.agencyDraft}/suspension`);
            expect(response.status).toBe(403);
        });
    });
});
