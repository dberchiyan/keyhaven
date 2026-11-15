import { randomUUID } from 'node:crypto';
import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

interface Point {
  day: string;
  views: number;
  saves: number;
}
const seriesOf = (response: { body: unknown }): Point[] =>
  (bodyOf(response as never).series as Point[] | undefined) ?? [];

/**
 * The owner's insights: views and saves per day over a window, the previous window for the
 * comparison, the busiest listings — scoped like the dashboard (403 for someone else's).
 */
describe('Listing insights', () => {
  let testApp: TestApp;
  let f: Fixtures;
  let tenant: Client;
  let landlord: Client;
  let otherLandlord: Client;
  let agent: Client;
  let admin: Client;

  beforeAll(async () => {
    testApp = await createTestApp();
    f = await createFixtures(`insights-${randomUUID().slice(0, 8)}`);
    tenant = new Client(testApp.app);
    landlord = new Client(testApp.app);
    otherLandlord = new Client(testApp.app);
    agent = new Client(testApp.app);
    admin = new Client(testApp.app);
    for (const [client, user] of [
      [tenant, f.tenant],
      [landlord, f.landlord],
      [otherLandlord, f.otherLandlord],
      [agent, f.agent],
      [admin, f.admin],
    ] as const) {
      expect((await client.login(user.email, PASSWORD)).status).toBe(200);
    }
    // Today: the tenant and a visitor open the landlord's home; the tenant saves it.
    expect((await tenant.get(`/api/v1/listings/${f.landlordPublished}`)).status).toBe(200);
    const visitor = new Client(testApp.app);
    expect((await visitor.get(`/api/v1/listings/${f.landlordPublished}`)).status).toBe(200);
    expect((await tenant.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(200);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('answers one listing’s views and saves per day, today last, against the period before', async () => {
    const response = await landlord.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      period: 30,
      to: todayUtc(),
      totals: { views: 2, saves: 1 },
      previous: { views: 0, saves: 0 },
    });
    const series = seriesOf(response);
    expect(series).toHaveLength(30);
    expect(series.at(-1)).toEqual({ day: todayUtc(), views: 2, saves: 1 });
    // Every other day is present and quiet — the chart never has holes.
    expect(series.slice(0, -1).every((point) => point.views === 0 && point.saves === 0)).toBe(true);
    expect(bodyOf(response).from).toBe(series[0]?.day);
  });

  it('takes the window from the query — 7 or 90 days, anything else is 400', async () => {
    const week = await landlord.get(
      `/api/v1/managed-listings/${f.landlordPublished}/insights?period=7`,
    );
    expect(week.status).toBe(200);
    expect(seriesOf(week)).toHaveLength(7);
    expect(bodyOf(week).period).toBe(7);
    const quarter = await landlord.get(
      `/api/v1/managed-listings/${f.landlordPublished}/insights?period=90`,
    );
    expect(seriesOf(quarter)).toHaveLength(90);
    const odd = await landlord.get(
      `/api/v1/managed-listings/${f.landlordPublished}/insights?period=15`,
    );
    expect(odd.status).toBe(400);
    expect(odd.body).toMatchObject({ error: 'VALIDATION_FAILED' });
  });

  it('sums the dashboard’s scope and names the busiest listings', async () => {
    const response = await landlord.get('/api/v1/managed-listings/insights');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ totals: { views: 2, saves: 1 } });
    // toMatchObject on an array checks its length as well as each row.
    expect(bodyOf(response).top).toMatchObject([
      { listing: { id: f.landlordPublished }, views: 2, saves: 1 },
    ]);
    // The agency saw nothing: a quiet scope has empty totals and no top rows.
    const agency = await agent.get('/api/v1/managed-listings/insights');
    expect(agency.status).toBe(200);
    expect(agency.body).toMatchObject({ totals: { views: 0, saves: 0 }, top: [] });
    // Admins see the whole site.
    const all = await admin.get('/api/v1/managed-listings/insights?period=7');
    expect(all.status).toBe(200);
    expect((bodyOf(all).totals as { views: number }).views).toBeGreaterThanOrEqual(2);
  });

  it('is scoped like the dashboard: 403 for a tenant and for someone else’s listing', async () => {
    expect((await tenant.get('/api/v1/managed-listings/insights')).status).toBe(403);
    expect(
      (await tenant.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status,
    ).toBe(403);
    expect(
      (await otherLandlord.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status,
    ).toBe(403);
    expect(
      (await agent.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status,
    ).toBe(403);
    // An admin reaches any listing; an unknown id is 404.
    expect(
      (await admin.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status,
    ).toBe(200);
    expect((await admin.get(`/api/v1/managed-listings/${randomUUID()}/insights`)).status).toBe(404);
  });
});
