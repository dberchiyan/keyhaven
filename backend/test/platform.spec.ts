import { JobLock } from '@/common/persistence/job-lock';
import { JobName } from '@/common/persistence/job-name';

import { Client, createTestApp, type TestApp } from './app';

describe('Platform', () => {
    let testApp: TestApp;

    beforeAll(async () => {
        testApp = await createTestApp();
    });

    afterAll(async () => {
        await testApp.close();
    });

    it('answers API calls with Cache-Control: no-store (API-8)', async () => {
        const response = await new Client(testApp.app).get('/api/v1/cities');
        expect(response.status).toBe(200);
        expect(response.headers['cache-control']).toBe('no-store');
    });

    it('runs a job on one holder at a time and releases the lock afterwards (DATA-43)', async () => {
        const jobLock = testApp.app.get(JobLock);
        let releaseFirst = (): void => undefined;
        const firstRunning = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });
        const runs: string[] = [];
        const first = jobLock.runExclusive(JobName.SEND_SAVED_SEARCH_DIGESTS, async () => {
            runs.push('first');
            await firstRunning;
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
        const second = await jobLock.runExclusive(JobName.SEND_SAVED_SEARCH_DIGESTS, () => {
            runs.push('second');
            return Promise.resolve();
        });
        releaseFirst();
        expect(await first).toBe(true);
        expect(second).toBe(false);
        expect(runs).toEqual(['first']);

        const third = await jobLock.runExclusive(JobName.SEND_SAVED_SEARCH_DIGESTS, () => {
            runs.push('third');
            return Promise.resolve();
        });
        expect(third).toBe(true);
        expect(runs).toEqual(['first', 'third']);
    });
});
