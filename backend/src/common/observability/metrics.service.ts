import { Inject, Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, exponentialBuckets, Gauge, Histogram, Registry } from '@prometheus-io/client';
import type { Pool } from 'pg';

import { JOB_NAMES } from '../persistence/job-name';
import { PG_POOL } from '../persistence/pg-pool';

const FASTEST_BUCKET_SECONDS = 0.025;
const BUCKET_COUNT = 9;
const HTTP_DURATION_BUCKETS_SECONDS = exponentialBuckets(FASTEST_BUCKET_SECONDS, 2, BUCKET_COUNT);

export const JobOutcome = {
    COMPLETED: 'completed',
    SKIPPED: 'skipped',
    FAILED: 'failed',
} as const;
export type JobOutcome = (typeof JobOutcome)[keyof typeof JobOutcome];

/** OBS-3: one registry per instance — HTTP timings by route pattern, the pool's connections, job runs. */
@Injectable()
export class MetricsService {
    readonly registry = new Registry();

    readonly httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration by route pattern',
        labelNames: ['method', 'route', 'status'] as const,
        buckets: HTTP_DURATION_BUCKETS_SECONDS,
        registers: [this.registry],
    });

    readonly failedLogins = new Counter({
        name: 'auth_failed_logins_total',
        help: 'Failed login attempts',
        registers: [this.registry],
    });

    readonly rateLimitHits = new Counter({
        name: 'rate_limit_hits_total',
        help: 'Requests rejected by a rate limiter',
        labelNames: ['limiter'] as const,
        registers: [this.registry],
    });

    readonly idempotencyCollisions = new Counter({
        name: 'idempotency_collisions_total',
        help: 'Requests rejected for a reused or in-flight Idempotency-Key',
        labelNames: ['reason'] as const,
        registers: [this.registry],
    });

    readonly emailsSent = new Counter({
        name: 'emails_sent_total',
        help: 'Emails handed to the transport, by outcome',
        labelNames: ['outcome'] as const,
        registers: [this.registry],
    });

    readonly jobRuns = new Counter({
        name: 'job_runs_total',
        help: 'Scheduled job runs by job and outcome (skipped: another instance held the lock)',
        labelNames: ['job', 'outcome'] as const,
        registers: [this.registry],
    });

    readonly dbPoolConnections: Gauge<'state'>;

    constructor(@Inject(PG_POOL) pool: Pool) {
        collectDefaultMetrics({ register: this.registry });
        this.dbPoolConnections = new Gauge({
            name: 'db_pool_connections',
            help: 'PostgreSQL pool connections by state',
            labelNames: ['state'] as const,
            registers: [this.registry],
            collect() {
                this.set({ state: 'total' }, pool.totalCount);
                this.set({ state: 'idle' }, pool.idleCount);
                this.set({ state: 'waiting' }, pool.waitingCount);
            },
        });
        for (const job of JOB_NAMES) {
            for (const outcome of Object.values(JobOutcome)) {
                this.jobRuns.inc({ job, outcome }, 0);
            }
        }
    }
}
