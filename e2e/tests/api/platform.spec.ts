import { expect, test } from '@playwright/test';

import { ClientPool } from '../../support/client';

const clients = new ClientPool();

test.afterAll(async () => {
    await clients.disposeAll();
});

test('answers API calls with Cache-Control: no-store (API-8)', async () => {
    const response = await (await clients.open()).get('/api/v1/cities');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
});

test('reports itself live and ready (OBS-2)', async () => {
    const client = await clients.open();
    expect((await client.get('/health/live')).status).toBe(200);
    expect((await client.get('/health/ready')).body).toEqual({ status: 'ok' });
});
