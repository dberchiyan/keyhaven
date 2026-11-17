import { randomUUID } from 'node:crypto';

/** The fixtures run of demo.spec.ts; its tenant is a showcase account (DEMO_PROTECTED_EMAILS). */
export const DEMO_RUN = `demo-${randomUUID().slice(0, 8)}`;

/**
 * Imported first by demo.spec.ts: the configuration is validated when the application module loads, so the demo
 * switch and the protected address must be set before `./app` is imported (test/env.ts turns them off for every
 * other file).
 */
const enableDemoMode = (): void => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_PROTECTED_EMAILS = `tenant-${DEMO_RUN}@test.example`;
};

enableDemoMode();
