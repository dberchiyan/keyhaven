import { testDatabaseUrl } from './test-database';

/**
 * Runs in every test worker before the modules load: `.env` provides the local configuration (CI sets every variable
 * in the environment instead), then the test database replaces the development one and the mail transport is the log.
 * Jest sets NODE_ENV=test while the app knows the dev and prod profiles only (PLAT-4); the app's own log lines would
 * drown the test report.
 */
const configureTestEnvironment = (): void => {
    try {
        process.loadEnvFile('.env');
    } catch {}
    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'dev';
    process.env.DATABASE_URL = testDatabaseUrl();
    process.env.EMAIL_TRANSPORT = 'log';
    process.env.DB_QUERY_LOG = 'false';
    process.env.DEMO_MODE = 'false';
    process.env.LOG_LEVEL = 'silent';
};

configureTestEnvironment();
