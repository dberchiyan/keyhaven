import { defineConfig, devices } from '@playwright/test';

const LOCAL_DEV_URL = 'http://localhost:5180';
const PREVIEW_PORT = 4180;
const SERVER_TIMEOUT_MS = 60_000;
const baseURL = process.env.E2E_BASE_URL ?? LOCAL_DEV_URL;
const isPreview = baseURL.endsWith(`:${String(PREVIEW_PORT)}`);

export default defineConfig({
    testDir: 'e2e',
    fullyParallel: false,
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: { baseURL, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: isPreview
        ? {
              command: `npm run preview -- --port ${String(PREVIEW_PORT)} --strictPort`,
              url: baseURL,
              reuseExistingServer: true,
              timeout: SERVER_TIMEOUT_MS,
          }
        : undefined,
});
