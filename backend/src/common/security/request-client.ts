import { createHash } from 'node:crypto';
import type { Request } from 'express';

import { toUtcDay } from '../time/utc-day';

const MAX_USER_AGENT_LENGTH = 512;
const MAX_TOKEN_LENGTH = 128;

/** Client IP as resolved by Express `trust proxy` (TRUST_PROXY_HOPS). */
export const clientIp = (request: Request): string => request.ip ?? 'unknown';

export const clientUserAgent = (request: Request): string | null => {
    const userAgent = request.get('user-agent');
    return userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null;
};

export const readCookie = (request: Request, name: string): string | undefined => {
    const cookies: unknown = request.cookies;
    if (typeof cookies !== 'object' || cookies === null || !(name in cookies)) {
        return undefined;
    }
    const value: unknown = Reflect.get(cookies, name);
    return typeof value === 'string' && value.length > 0 && value.length <= MAX_TOKEN_LENGTH ? value : undefined;
};

/**
 * A visitor without an account, for counting views once per day: SHA-256 of the UTC day, the
 * client address and the user agent — never stored in the clear, never tied to a person. `now` is the request's
 * instant (CORE-26).
 */
export const visitorKey = (request: Request, now: Date): string =>
    createHash('sha256')
        .update(`${toUtcDay(now)}|${clientIp(request)}|${clientUserAgent(request) ?? ''}`)
        .digest('hex');
