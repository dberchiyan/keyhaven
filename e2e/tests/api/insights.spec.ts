import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { type ApiResponse, type Client, ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD } from '../../support/db';

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

interface Point {
    day: string;
    views: number;
    saves: number;
}
const seriesOf = (response: ApiResponse): Point[] => (response.body.series as Point[] | undefined) ?? [];

test.describe.configure({ mode: 'serial' });

test.describe('Listing insights', () => {
    const clients = new ClientPool();
    let f: Fixtures;
    let tenant: Client;
    let landlord: Client;
    let otherLandlord: Client;
    let agent: Client;
    let admin: Client;

    test.beforeAll(async () => {
        f = await createFixtures(`insights-${randomUUID().slice(0, 8)}`);
        tenant = await clients.signedIn(f.tenant.email, PASSWORD);
        landlord = await clients.signedIn(f.landlord.email, PASSWORD);
        otherLandlord = await clients.signedIn(f.otherLandlord.email, PASSWORD);
        agent = await clients.signedIn(f.agent.email, PASSWORD);
        admin = await clients.signedIn(f.admin.email, PASSWORD);
        expect((await tenant.get(`/api/v1/listings/${f.landlordPublished}`)).status).toBe(200);
        const visitor = await clients.open();
        expect((await visitor.get(`/api/v1/listings/${f.landlordPublished}`)).status).toBe(200);
        expect((await tenant.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(200);
    });

    test.afterAll(async () => {
        await clients.disposeAll();
    });

    test('answers one listing’s views and saves per day, today last, against the period before', async () => {
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
        expect(series.slice(0, -1).every((point) => point.views === 0 && point.saves === 0)).toBe(true);
        expect(response.body.from).toBe(series[0]?.day);
    });

    test('takes the window from the query — 7 or 90 days, anything else is 400', async () => {
        const week = await landlord.get(`/api/v1/managed-listings/${f.landlordPublished}/insights?period=7`);
        expect(week.status).toBe(200);
        expect(seriesOf(week)).toHaveLength(7);
        expect(week.body.period).toBe(7);
        const quarter = await landlord.get(`/api/v1/managed-listings/${f.landlordPublished}/insights?period=90`);
        expect(seriesOf(quarter)).toHaveLength(90);
        const odd = await landlord.get(`/api/v1/managed-listings/${f.landlordPublished}/insights?period=15`);
        expect(odd.status).toBe(400);
        expect(odd.body).toMatchObject({ error: 'VALIDATION_FAILED' });
    });

    test('sums the dashboard’s scope and names the busiest listings', async () => {
        const response = await landlord.get('/api/v1/managed-listings/insights');
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ totals: { views: 2, saves: 1 } });
        expect(response.body.top).toMatchObject([{ listing: { id: f.landlordPublished }, views: 2, saves: 1 }]);
        const agency = await agent.get('/api/v1/managed-listings/insights');
        expect(agency.status).toBe(200);
        expect(agency.body).toMatchObject({ totals: { views: 0, saves: 0 }, top: [] });
        const all = await admin.get('/api/v1/managed-listings/insights?period=7');
        expect(all.status).toBe(200);
        expect((all.body.totals as { views: number }).views).toBeGreaterThanOrEqual(2);
    });

    test('is scoped like the dashboard: 403 for a tenant and for someone else’s listing', async () => {
        expect((await tenant.get('/api/v1/managed-listings/insights')).status).toBe(403);
        expect((await tenant.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status).toBe(403);
        expect((await otherLandlord.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status).toBe(403);
        expect((await agent.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status).toBe(403);
        expect((await admin.get(`/api/v1/managed-listings/${f.landlordPublished}/insights`)).status).toBe(200);
        expect((await admin.get(`/api/v1/managed-listings/${randomUUID()}/insights`)).status).toBe(404);
    });
});
