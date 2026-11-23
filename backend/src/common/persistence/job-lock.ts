import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Pool } from 'pg';
import { z } from 'zod';

import { JobOutcome, MetricsService } from '../observability/metrics.service';
import type { JobName } from './job-name';
import { PG_POOL } from './pg-pool';

const lockRowSchema = z.object({ locked: z.boolean() });

@Injectable()
export class JobLock {
    constructor(
        @Inject(PG_POOL) private readonly pool: Pool,
        private readonly metrics: MetricsService,
        @InjectPinoLogger(JobLock.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * DATA-43: a cron runs on one instance at a time — `pg_try_advisory_lock` on one pooled connection, released in
     * `finally`; another instance holding the lock skips this run instead of repeating its effects. Session-level
     * advisory locks belong to the connection, so the same client takes and releases it. Answers the job's result, or
     * undefined when the run was skipped. OBS-3: every run is counted by its outcome.
     */
    async runExclusive<T>(name: JobName, job: () => Promise<T>): Promise<T | undefined> {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [name]);
            if (!lockRowSchema.parse(result.rows[0]).locked) {
                this.logger.info({ job: name }, 'Job skipped: another instance holds its lock');
                this.metrics.jobRuns.inc({ job: name, outcome: JobOutcome.SKIPPED });
                return undefined;
            }
            try {
                const outcome = await job();
                this.metrics.jobRuns.inc({ job: name, outcome: JobOutcome.COMPLETED });
                return outcome;
            } catch (error: unknown) {
                this.metrics.jobRuns.inc({ job: name, outcome: JobOutcome.FAILED });
                throw error;
            } finally {
                await client.query('SELECT pg_advisory_unlock(hashtext($1))', [name]);
            }
        } finally {
            client.release();
        }
    }
}
