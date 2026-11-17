import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from '@prometheus-io/client';

const HTTP_DURATION_BUCKETS_SECONDS = Object.values({
    ms25: 0.025,
    ms50: 0.05,
    ms100: 0.1,
    ms250: 0.25,
    ms500: 0.5,
    s1: 1,
    s2500: 2.5,
    s5: 5,
});

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

    constructor() {
        collectDefaultMetrics({ register: this.registry });
    }
}
