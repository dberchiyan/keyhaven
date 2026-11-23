import { SetMetadata } from '@nestjs/common';

import { EMAIL_MAX_LENGTH } from '../dto/limits';

export const RateLimitName = {
    LOGIN: 'LOGIN',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    REGISTRATION: 'REGISTRATION',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    EMAIL_VERIFICATION_REQUEST: 'EMAIL_VERIFICATION_REQUEST',
    TOKEN_REDEMPTION: 'TOKEN_REDEMPTION',
} as const;
export type RateLimitName = (typeof RateLimitName)[keyof typeof RateLimitName];

export const RATE_LIMIT_KEY = 'security:rate-limit';

/** Applies a named limiter to the handler instead of the per-session ceiling. */
export const RateLimit = (name: RateLimitName): MethodDecorator => SetMetadata(RATE_LIMIT_KEY, name);

/** Login attempts are counted per (IP, email); the raw body is read before validation. */
export const loginRateLimitKey = (ip: string, email: unknown): string[] => [
    ip,
    typeof email === 'string' ? email.trim().toLowerCase().slice(0, EMAIL_MAX_LENGTH) : '',
];
