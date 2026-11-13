import { randomUUID } from 'node:crypto';
import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';

/**
 * The access matrix (TASK → M0 "access tests pass for every role"): each role sees and changes
 * only what it may, checked on the server — foreign ids answer 403 (ownership) or 404 (admin
 * style, like an unknown id), tenants never reach the dashboard, only admins suspend.
 */
describe('Access by role', () => {
  let testApp: TestApp;
  let f: Fixtures;
  let tenant: Client;
  let landlord: Client;
  let agent: Client;
  let admin: Client;

  beforeAll(async () => {
    testApp = await createTestApp();
    f = await createFixtures(`access-${randomUUID().slice(0, 8)}`);
    tenant = new Client(testApp.app);
    landlord = new Client(testApp.app);
    agent = new Client(testApp.app);
    admin = new Client(testApp.app);
    for (const [client, user] of [
      [tenant, f.tenant],
      [landlord, f.landlord],
      [agent, f.agent],
      [admin, f.admin],
    ] as const) {
      expect((await client.login(user.email, PASSWORD)).status).toBe(200);
    }
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('signed out', () => {
    it('answers 401 UNAUTHORIZED without a session — the catalogue excepted', async () => {
      const anonymous = new Client(testApp.app);
      const response = await anonymous.get('/api/v1/managed-listings');
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: 'UNAUTHORIZED' });
      // Published homes are public: visitors browse without an account (CONTEXT.md).
      expect((await anonymous.get('/api/v1/listings')).status).toBe(200);
    });

    it('answers INVALID_CREDENTIALS for a wrong password and an unknown email alike', async () => {
      const anonymous = new Client(testApp.app);
      const wrong = await anonymous.login(f.tenant.email, 'Wrong-Password-1!');
      const unknown = await anonymous.login(`nobody-${randomUUID()}@test.example`, PASSWORD);
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body).toMatchObject({ error: 'INVALID_CREDENTIALS' });
      expect(unknown.body).toMatchObject({ error: 'INVALID_CREDENTIALS' });
    });
  });

  describe('every role', () => {
    it('lands on its own account with its role', async () => {
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

    it('sees a published listing without its exact address', async () => {
      const response = await tenant.get(`/api/v1/listings/${f.otherLandlordPublished}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ address: null, listedBy: { kind: 'LANDLORD' } });
      expect(JSON.stringify(response.body)).not.toContain('Secret St');
    });

    it('cannot see someone else’s unpublished listing — 404, like an unknown id', async () => {
      for (const client of [tenant, landlord, agent]) {
        const response = await client.get(`/api/v1/listings/${f.otherLandlordUnpublished}`);
        expect(response.status).toBe(404);
      }
      expect((await tenant.get(`/api/v1/listings/${randomUUID()}`)).status).toBe(404);
    });

    it('rejects a path id that is not a UUID with 400', async () => {
      const response = await tenant.get('/api/v1/listings/not-a-uuid');
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'INVALID_PARAMETER' });
    });
  });

  describe('tenant', () => {
    it('has no listings dashboard (403)', async () => {
      expect((await tenant.get('/api/v1/managed-listings')).status).toBe(403);
      expect((await tenant.get('/api/v1/managed-listings/status-counts')).status).toBe(403);
      expect((await tenant.get(`/api/v1/managed-listings/${f.landlordPublished}`)).status).toBe(
        403,
      );
    });

    it('cannot publish, unpublish or suspend anything (403)', async () => {
      for (const action of ['publication', 'unpublication', 'suspension']) {
        const response = await tenant.post(
          `/api/v1/managed-listings/${f.landlordPublished}/${action}`,
        );
        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({ error: 'FORBIDDEN' });
      }
    });
  });

  describe('landlord', () => {
    it('lists only their own listings, including drafts', async () => {
      const response = await landlord.get('/api/v1/managed-listings?size=100');
      expect(response.status).toBe(200);
      const ids = (response.body as { content: { id: string }[] }).content.map((item) => item.id);
      expect(ids.sort()).toEqual([f.landlordPublished, f.landlordDraft, f.landlordDemo].sort());
    });

    it('sees their own draft with the exact address', async () => {
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

    it('is refused another landlord’s listing in the dashboard — 403', async () => {
      expect(
        (await landlord.get(`/api/v1/managed-listings/${f.otherLandlordPublished}`)).status,
      ).toBe(403);
      expect(
        (await landlord.post(`/api/v1/managed-listings/${f.otherLandlordPublished}/unpublication`))
          .status,
      ).toBe(403);
      expect((await landlord.get(`/api/v1/managed-listings/${f.agencyDraft}`)).status).toBe(403);
    });

    it('publishes a draft and unpublishes it again; a repeat is a no-op', async () => {
      const published = await landlord.post(
        `/api/v1/managed-listings/${f.landlordDraft}/publication`,
      );
      expect(published.status).toBe(200);
      expect(published.body).toMatchObject({ status: 'PUBLISHED' });
      expect(typeof bodyOf(published).publishedAt).toBe('string');
      const again = await landlord.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`);
      expect(again.status).toBe(200);
      expect(again.body).toMatchObject({ status: 'PUBLISHED', version: bodyOf(published).version });
      // Now everyone finds it.
      expect((await tenant.get(`/api/v1/listings/${f.landlordDraft}`)).status).toBe(200);
      const unpublished = await landlord.post(
        `/api/v1/managed-listings/${f.landlordDraft}/unpublication`,
      );
      expect(unpublished.status).toBe(200);
      expect(unpublished.body).toMatchObject({ status: 'UNPUBLISHED' });
      expect((await tenant.get(`/api/v1/listings/${f.landlordDraft}`)).status).toBe(404);
    });

    it('cannot suspend — that is an admin action (403)', async () => {
      const response = await landlord.post(
        `/api/v1/managed-listings/${f.landlordPublished}/suspension`,
      );
      expect(response.status).toBe(403);
    });
  });

  describe('agent', () => {
    it('lists the agency’s listings only', async () => {
      const response = await agent.get('/api/v1/managed-listings?size=100');
      expect(response.status).toBe(200);
      const ids = (response.body as { content: { id: string }[] }).content.map((item) => item.id);
      expect(ids.sort()).toEqual([f.agencyPublished, f.agencyDraft, f.agencyDemo].sort());
    });

    it('manages the agency’s listings but not a landlord’s (403)', async () => {
      const own = await agent.get(`/api/v1/managed-listings/${f.agencyDraft}`);
      expect(own.status).toBe(200);
      expect(own.body).toMatchObject({ listedBy: { kind: 'AGENCY' } });
      expect((await agent.get(`/api/v1/managed-listings/${f.landlordDraft}`)).status).toBe(403);
      const publish = await agent.post(`/api/v1/managed-listings/${f.agencyDraft}/publication`);
      expect(publish.status).toBe(200);
      expect(publish.body).toMatchObject({ status: 'PUBLISHED' });
    });

    it('is refused another agency’s listing (403)', async () => {
      const otherAgent = new Client(testApp.app);
      expect((await otherAgent.login(f.otherAgencyAgent.email, PASSWORD)).status).toBe(200);
      expect((await otherAgent.get(`/api/v1/managed-listings/${f.agencyPublished}`)).status).toBe(
        403,
      );
      const list = await otherAgent.get('/api/v1/managed-listings?size=100');
      expect(list.body).toMatchObject({ totalElements: 0 });
    });
  });

  describe('admin', () => {
    it('sees every listing, foreign drafts included', async () => {
      const list = await admin.get('/api/v1/managed-listings?size=100');
      expect(list.status).toBe(200);
      const ids = (list.body as { content: { id: string }[] }).content.map((item) => item.id);
      expect(ids).toEqual(
        expect.arrayContaining([f.landlordDraft, f.otherLandlordUnpublished, f.agencyDraft]),
      );
      const draft = await admin.get(`/api/v1/listings/${f.otherLandlordUnpublished}`);
      expect(draft.status).toBe(200);
      expect(draft.body).toMatchObject({ address: { line1: '1 Secret St' } });
    });

    it('suspends a listing; the owner cannot publish it again; a repeat is a no-op', async () => {
      const suspended = await admin.post(
        `/api/v1/managed-listings/${f.otherLandlordPublished}/suspension`,
      );
      expect(suspended.status).toBe(200);
      expect(suspended.body).toMatchObject({ status: 'SUSPENDED' });
      expect((await tenant.get(`/api/v1/listings/${f.otherLandlordPublished}`)).status).toBe(404);
      const again = await admin.post(
        `/api/v1/managed-listings/${f.otherLandlordPublished}/suspension`,
      );
      expect(again.status).toBe(200);
      expect(again.body).toMatchObject({ status: 'SUSPENDED', version: bodyOf(suspended).version });

      const owner = new Client(testApp.app);
      expect((await owner.login(f.otherLandlord.email, PASSWORD)).status).toBe(200);
      const publish = await owner.post(
        `/api/v1/managed-listings/${f.otherLandlordPublished}/publication`,
      );
      expect(publish.status).toBe(422);
      expect(publish.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });
    });

    it('does not publish on behalf of owners (403) and answers 404 for an unknown id', async () => {
      expect(
        (await admin.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`)).status,
      ).toBe(403);
      expect((await admin.get(`/api/v1/managed-listings/${randomUUID()}`)).status).toBe(404);
      expect((await admin.post(`/api/v1/managed-listings/${randomUUID()}/suspension`)).status).toBe(
        404,
      );
    });
  });

  describe('CSRF', () => {
    it('refuses a mutation without the XSRF header', async () => {
      const response = await admin
        .get('/api/v1/auth/me')
        .then(() => new Client(testApp.app))
        .then(async (fresh) => {
          await fresh.login(f.admin.email, PASSWORD);
          return fresh;
        })
        .then((fresh) =>
          fresh.postWithoutCsrf(`/api/v1/managed-listings/${f.agencyDraft}/suspension`),
        );
      expect(response.status).toBe(403);
    });
  });
});
