import { testDatabaseUrl } from './test-database';

/**
 * Runs in every test worker before the modules load: `.env` provides the local configuration,
 * then the test database replaces the development one and the mail transport is the log.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // CI: every variable comes from the environment.
}
// Jest sets NODE_ENV=test; the app knows the dev and prod profiles only (platform.md).
process.env.NODE_ENV = 'development';
process.env.APP_ENV = 'dev';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.EMAIL_TRANSPORT = 'log';
process.env.DB_QUERY_LOG = 'false';
process.env.DEMO_MODE = 'false';
// The app's own log lines would drown the test report.
process.env.LOG_LEVEL = 'silent';
