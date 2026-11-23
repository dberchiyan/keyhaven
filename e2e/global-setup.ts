import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { connect } from 'node:net';
import path from 'node:path';
import pg from 'pg';

import { FakeMail } from './support/fakes/fake-mail';
import { FakeStorage } from './support/fakes/fake-storage';
import {
    BACKEND_DIR,
    databaseUrl,
    DEMO_PROTECTED_EMAIL,
    FRONTEND_DIR,
    FRONTEND_URL,
    LANDING_DIR,
    LANDING_URL,
    LOG_DIR,
    PORTS,
    STORAGE_BUCKET,
    STORAGE_URL,
} from './support/stack';

const READY_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 250;

const backendEnv = (port: number, isDemo: boolean): NodeJS.ProcessEnv => ({
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    APP_ENV: 'dev',
    NODE_ENV: 'development',
    PORT: String(port),
    TZ: 'UTC',
    APP_URL: FRONTEND_URL,
    DATABASE_URL: databaseUrl(),
    DB_POOL_SIZE: '5',
    DB_QUERY_LOG: 'false',
    LOG_LEVEL: 'warn',
    TRUST_PROXY_HOPS: '0',
    SESSION_COOKIE_NAME: 'keyhaven_session',
    COOKIE_SECURE: 'false',
    COOKIE_SAME_SITE: 'lax',
    SESSION_IDLE_TIMEOUT_MINUTES: '2880',
    SESSION_ABSOLUTE_TIMEOUT_MINUTES: '10080',
    CORS_ALLOWED_ORIGINS: FRONTEND_URL,
    SUPPORTED_LOCALES: 'en',
    EMAIL_TRANSPORT: 'smtp',
    SMTP_URL: `smtp://localhost:${String(PORTS.smtp)}`,
    EMAIL_FROM: 'Keyhaven <no-reply@keyhaven.test>',
    R2_ENDPOINT: STORAGE_URL,
    R2_REGION: 'us-east-1',
    R2_BUCKET: STORAGE_BUCKET,
    R2_ACCESS_KEY: 'e2e',
    R2_SECRET_KEY: 'e2e-secret',
    R2_PUBLIC_URL: `${STORAGE_URL}/${STORAGE_BUCKET}`,
    DEMO_MODE: String(isDemo),
    DEMO_PROTECTED_EMAILS: isDemo ? DEMO_PROTECTED_EMAIL : '',
});

const resetDatabase = async (): Promise<void> => {
    const client = new pg.Client({ connectionString: databaseUrl() });
    await client.connect();
    try {
        await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    } finally {
        await client.end();
    }
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
        cwd: BACKEND_DIR,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl() },
    });
};

const start = (name: string, command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): ChildProcess => {
    const log = createWriteStream(path.join(LOG_DIR, `${name}.log`));
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    return child;
};

const isTaken = (port: number): Promise<boolean> =>
    new Promise((resolve) => {
        const socket = connect({ port, host: 'localhost' });
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('error', () => {
            resolve(false);
        });
    });

/** A server left from an earlier run would answer in place of this one (Astro's preview even moves to the next port). */
const ensurePortsFree = async (): Promise<void> => {
    const ports = Object.values(PORTS);
    const checks = await Promise.all(ports.map(isTaken));
    const taken = ports.filter((_port, index) => checks[index]);
    if (taken.length > 0) {
        throw new Error(`Ports in use: ${taken.join(', ')} — stop what listens there (an earlier run?) and retry`);
    }
};

const waitFor = async (url: string): Promise<void> => {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    for (;;) {
        try {
            if ((await fetch(url)).ok) {
                return;
            }
        } catch {
            if (Date.now() > deadline) {
                throw new Error(`${url} did not answer within ${String(READY_TIMEOUT_MS)} ms (logs: ${LOG_DIR})`);
            }
        }
        await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
    }
};

/**
 * The whole stack for one run, owned by the tests: a database reset to the committed migrations, the backend, the
 * frontend and the landing built from the working tree, a fake SMTP server and a fake S3 store, the backend twice
 * (normal and demo mode — the demo one protects the `DEMO_RUN` tenant, so that run name is fixed), the frontend's
 * production build behind `vite preview` and the landing's behind `astro preview` (`--ignore-lock`: a foreground
 * one-off server, never Astro's background one). `E2E_SKIP_BUILD=1` reuses the last builds.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
    mkdirSync(LOG_DIR, { recursive: true });
    await ensurePortsFree();
    await resetDatabase();
    if (!process.env.E2E_SKIP_BUILD) {
        for (const dir of [BACKEND_DIR, FRONTEND_DIR, LANDING_DIR]) {
            execFileSync('npm', ['run', 'build'], { cwd: dir, stdio: 'inherit' });
        }
    }
    const mail = new FakeMail();
    await mail.start(PORTS.smtp, PORTS.mailbox);
    const storage = new FakeStorage();
    await storage.start(PORTS.storage);
    const backendMain = path.join(BACKEND_DIR, 'dist', 'main.js');
    const processes = [
        start('backend', 'node', [backendMain], import.meta.dirname, backendEnv(PORTS.backend, false)),
        start('backend-demo', 'node', [backendMain], import.meta.dirname, backendEnv(PORTS.demoBackend, true)),
        start('frontend', 'npx', ['vite', 'preview', '--port', String(PORTS.frontend), '--strictPort'], FRONTEND_DIR, {
            ...process.env,
            API_PROXY_TARGET: `http://localhost:${String(PORTS.backend)}`,
        }),
        start(
            'landing',
            'npx',
            ['astro', 'preview', '--port', String(PORTS.landing), '--ignore-lock'],
            LANDING_DIR,
            process.env,
        ),
    ];
    const stop = async (): Promise<void> => {
        for (const child of processes) {
            child.kill('SIGTERM');
        }
        await Promise.all([mail.stop(), storage.stop()]);
    };
    try {
        await Promise.all([
            waitFor(`http://localhost:${String(PORTS.backend)}/ready`),
            waitFor(`http://localhost:${String(PORTS.demoBackend)}/ready`),
            waitFor(FRONTEND_URL),
            waitFor(LANDING_URL),
        ]);
    } catch (error: unknown) {
        await stop();
        throw error;
    }
    return stop;
}
