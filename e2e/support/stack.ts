import path from 'node:path';

const DEFAULT_DATABASE_URL = 'postgresql://keyhaven:keyhaven@localhost:5432/keyhaven_test?schema=public';

export const PORTS = {
    backend: 3100,
    demoBackend: 3101,
    frontend: 4180,
    smtp: 2525,
    mailbox: 2526,
    storage: 9900,
    landing: 4181,
} as const;

export const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');
export const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
export const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
export const LANDING_DIR = path.join(ROOT_DIR, 'landing');
export const LOG_DIR = path.join(ROOT_DIR, 'e2e', 'test-results', 'logs');

export const BACKEND_URL = `http://localhost:${String(PORTS.backend)}`;
export const DEMO_BACKEND_URL = `http://localhost:${String(PORTS.demoBackend)}`;
export const FRONTEND_URL = `http://localhost:${String(PORTS.frontend)}`;
export const LANDING_URL = `http://localhost:${String(PORTS.landing)}`;
export const MAILBOX_URL = `http://localhost:${String(PORTS.mailbox)}`;
export const STORAGE_URL = `http://localhost:${String(PORTS.storage)}`;
export const STORAGE_BUCKET = 'keyhaven';

export const DEMO_RUN = 'demo';
export const DEMO_PROTECTED_EMAIL = `tenant-${DEMO_RUN}@test.example`;

/** The database the run owns and resets — never the development one (its name must say `test`). */
export const databaseUrl = (): string => {
    const url = process.env.E2E_DATABASE_URL ?? DEFAULT_DATABASE_URL;
    const name = new URL(url).pathname.replace(/^\//, '');
    if (!/test/i.test(name)) {
        throw new Error(`Refusing to use "${name}": the end-to-end database name must contain "test"`);
    }
    return url;
};
