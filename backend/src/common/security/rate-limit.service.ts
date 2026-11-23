import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { RateLimiterPostgres, RateLimiterRes } from 'rate-limiter-flexible';

import { RateLimitExceededException } from '../exception/api.exception';
import { MetricsService } from '../observability/metrics.service';
import { PG_POOL } from '../persistence/pg-pool';
import { MS_PER_SECOND, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '../time/units';
import { RateLimitName } from './rate-limit';

const TABLE_NAME = 'rate_limits';
const SESSION_LIMIT = 'SESSION';
const VISITOR_LIMIT = 'VISITOR';
type LimiterName = RateLimitName | typeof SESSION_LIMIT | typeof VISITOR_LIMIT;

const GUESS_WINDOW_MINUTES = 15;
const PASSWORD_GUESSES = 5;
const TOKEN_GUESSES = 10;
const ACCOUNTS_PER_HOUR = 3;
const RESET_EMAILS_PER_HOUR = 3;
const VERIFICATION_EMAILS_PER_HOUR = 5;
const REQUESTS_PER_MINUTE = 300;
const GUESS_WINDOW_SECONDS = GUESS_WINDOW_MINUTES * SECONDS_PER_MINUTE;

const LIMITS: Readonly<Record<LimiterName, { points: number; durationSeconds: number }>> = {
    [RateLimitName.LOGIN]: { points: PASSWORD_GUESSES, durationSeconds: GUESS_WINDOW_SECONDS },
    [RateLimitName.PASSWORD_CHANGE]: { points: PASSWORD_GUESSES, durationSeconds: GUESS_WINDOW_SECONDS },
    [RateLimitName.REGISTRATION]: { points: ACCOUNTS_PER_HOUR, durationSeconds: SECONDS_PER_HOUR },
    [RateLimitName.PASSWORD_RESET_REQUEST]: { points: RESET_EMAILS_PER_HOUR, durationSeconds: SECONDS_PER_HOUR },
    [RateLimitName.EMAIL_VERIFICATION_REQUEST]: {
        points: VERIFICATION_EMAILS_PER_HOUR,
        durationSeconds: SECONDS_PER_HOUR,
    },
    [RateLimitName.TOKEN_REDEMPTION]: { points: TOKEN_GUESSES, durationSeconds: GUESS_WINDOW_SECONDS },
    [SESSION_LIMIT]: { points: REQUESTS_PER_MINUTE, durationSeconds: SECONDS_PER_MINUTE },
    [VISITOR_LIMIT]: { points: REQUESTS_PER_MINUTE, durationSeconds: SECONDS_PER_MINUTE },
};

/** Keys are hashed so no IP or email is stored in the limiter table. */
const toKey = (parts: readonly string[]): string => createHash('sha256').update(parts.join('|')).digest('hex');

/**
 * AUTH-6: login and password changes allow 5 guesses per 15 minutes (by IP and email, by user); emailed links carry
 * 256-bit tokens, so their limit only keeps guessing from costing queries; every session and every visitor's address
 * gets one per-minute ceiling on everything else. The library deletes expired rows itself on a timer.
 */
@Injectable()
export class RateLimitService {
    private readonly limiters: ReadonlyMap<LimiterName, RateLimiterPostgres>;

    constructor(
        @Inject(PG_POOL) pool: Pool,
        private readonly metrics: MetricsService,
    ) {
        this.limiters = new Map(
            (Object.keys(LIMITS) as LimiterName[]).map((name) => [
                name,
                new RateLimiterPostgres({
                    storeClient: pool,
                    storeType: 'pool',
                    tableName: TABLE_NAME,
                    tableCreated: true,
                    clearExpiredByTimeout: true,
                    keyPrefix: name.toLowerCase(),
                    points: LIMITS[name].points,
                    duration: LIMITS[name].durationSeconds,
                }),
            ]),
        );
    }

    consume(name: RateLimitName, keyParts: readonly string[]): Promise<void> {
        return this.consumeLimiter(name, toKey(keyParts));
    }

    consumeSession(sessionId: string): Promise<void> {
        return this.consumeLimiter(SESSION_LIMIT, sessionId);
    }

    consumeVisitor(ip: string): Promise<void> {
        return this.consumeLimiter(VISITOR_LIMIT, toKey([ip]));
    }

    /** Has this key used up its budget (the next attempt will be refused)? */
    async isExhausted(name: RateLimitName, keyParts: readonly string[]): Promise<boolean> {
        const state = await this.limiter(name).get(toKey(keyParts));
        return state !== null && state.consumedPoints >= LIMITS[name].points;
    }

    async reset(name: RateLimitName, keyParts: readonly string[]): Promise<void> {
        await this.limiter(name).delete(toKey(keyParts));
    }

    private async consumeLimiter(name: LimiterName, key: string): Promise<void> {
        try {
            await this.limiter(name).consume(key);
        } catch (rejection: unknown) {
            if (rejection instanceof RateLimiterRes) {
                this.metrics.rateLimitHits.inc({ limiter: name.toLowerCase() });
                throw new RateLimitExceededException(Math.ceil(rejection.msBeforeNext / MS_PER_SECOND));
            }
            throw rejection;
        }
    }

    private limiter(name: LimiterName): RateLimiterPostgres {
        const limiter = this.limiters.get(name);
        if (!limiter) {
            throw new Error(`Unknown rate limiter ${name}`);
        }
        return limiter;
    }
}
