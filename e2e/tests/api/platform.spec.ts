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

test('reports itself live and ready, never cached (OBS-2)', async () => {
    const client = await clients.open();
    const live = await client.get('/health');
    expect(live.status).toBe(200);
    expect(live.headers['cache-control']).toBe('no-store');
    const ready = await client.get('/ready');
    expect(ready.body).toEqual({ status: 'ok' });
    expect(ready.headers['cache-control']).toBe('no-store');
});

test('exposes request, pool and job metrics without a session (OBS-3)', async () => {
    const client = await clients.open();
    await client.get('/api/v1/cities');
    const response = await client.get('/metrics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('http_request_duration_seconds_bucket');
    expect(response.text).toMatch(/route="\/api\/v1\/cities"/);
    expect(response.text).toMatch(/db_pool_connections\{state="total"\} \d+/);
    expect(response.text).toContain('job_runs_total{job="viewing.expire-unanswered",outcome="completed"}');
});
