import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Pool } from 'pg';
import { z } from 'zod';

import type { JobName } from './job-name';
import { PG_POOL } from './pg-pool';

const lockRowSchema = z.object({ locked: z.boolean() });

@Injectable()
export class JobLock {
    constructor(
        @Inject(PG_POOL) private readonly pool: Pool,
        @InjectPinoLogger(JobLock.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * DATA-43: a cron runs on one instance at a time — `pg_try_advisory_lock` on one pooled connection, released in
     * `finally`; another instance holding the lock skips this run instead of repeating its effects. Session-level
     * advisory locks belong to the connection, so the same client takes and releases it.
     */
    async runExclusive(name: JobName, job: () => Promise<void>): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [name]);
            if (!lockRowSchema.parse(result.rows[0]).locked) {
                this.logger.info({ job: name }, 'Job skipped: another instance holds its lock');
                return false;
            }
            try {
                await job();
                return true;
            } finally {
                await client.query('SELECT pg_advisory_unlock(hashtext($1))', [name]);
            }
        } finally {
            client.release();
        }
    }
}
