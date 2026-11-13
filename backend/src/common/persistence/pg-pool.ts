import { Pool } from 'pg';
import type { AppConfigService } from '../config/app-config.service';

export const PG_POOL = Symbol('PG_POOL');

const CONNECTION_TIMEOUT_MS = 5_000;
const STATEMENT_TIMEOUT_MS = 15_000;
const IDLE_TIMEOUT_MS = 30_000;

/**
 * Every connection works in UTC (data.md → Time). Prisma sends instants without a zone, and a
 * server whose default is a local zone would store them shifted — the session setting wins.
 */
export const PG_SESSION_OPTIONS = '-c timezone=UTC';

/** One explicit pool shared by Prisma and the rate limiter store (platform.md → pool). */
export const createPgPool = (config: AppConfigService): Pool =>
  new Pool({
    connectionString: config.get('DATABASE_URL'),
    options: PG_SESSION_OPTIONS,
    max: config.get('DB_POOL_SIZE'),
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: STATEMENT_TIMEOUT_MS,
  });
