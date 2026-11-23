import { defineConfig, devices } from '@playwright/test';

import { BACKEND_URL, FRONTEND_URL, LANDING_URL } from './support/stack';

export default defineConfig({
    globalSetup: './global-setup.ts',
    fullyParallel: false,
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    reporter: [['list'], ['html', { open: 'never' }]],
    use: { trace: 'retain-on-failure' },
    projects: [
        { name: 'api', testDir: 'tests/api', use: { baseURL: BACKEND_URL } },
        { name: 'ui', testDir: 'tests/ui', use: { ...devices['Desktop Chrome'], baseURL: FRONTEND_URL } },
        { name: 'landing', testDir: 'tests/landing', use: { ...devices['Desktop Chrome'], baseURL: LANDING_URL } },
    ],
});
