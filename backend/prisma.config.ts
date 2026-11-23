import { defineConfig, env } from 'prisma/config';

try {
    process.loadEnvFile('.env');
} catch {}

// eslint-disable-next-line no-restricted-syntax -- Prisma loads the config's default export
export default defineConfig({
    schema: 'prisma/schema',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url: env('DATABASE_URL'),
        ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL } : {}),
    },
});
