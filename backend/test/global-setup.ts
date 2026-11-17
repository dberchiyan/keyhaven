import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

import { testDatabaseUrl } from './test-database';

/**
 * Empties the test database (its `public` schema is dropped and recreated — only on a database
 * whose name says `test`, so a mistyped URL cannot hit development data) and applies every
 * committed migration, so each run starts from the migrations alone. CI sets every variable in the environment.
 */
// eslint-disable-next-line no-restricted-syntax -- Jest's globalSetup runs the module's default export
export default async (): Promise<void> => {
    try {
        process.loadEnvFile('.env');
    } catch {}
    const url = testDatabaseUrl();
    const databaseName = new URL(url).pathname.replace(/^\//, '');
    if (!/test/i.test(databaseName)) {
        throw new Error(`Refusing to reset "${databaseName}": the test database name must contain "test"`);
    }
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
        await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    } finally {
        await client.end();
    }
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: url },
    });
};
