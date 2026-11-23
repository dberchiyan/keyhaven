import { RequestMethod } from '@nestjs/common';

import type { Policy } from '../security/policy';
import type { ErrorCode } from './error-code';

export interface RouteContract {
    method: RequestMethod;
    policy: Policy | undefined;
    hasPathParams: boolean;
    hasBody: boolean;
    hasQuery: boolean;
    isPageable: boolean;
    isIdempotent: boolean;
    isRateLimited: boolean;
    isDemoRestricted: boolean;
    isOpenToEveryone: boolean;
}

const SAFE_METHODS: ReadonlySet<RequestMethod> = new Set([RequestMethod.GET, RequestMethod.HEAD]);

/**
 * API-34: the errors the kit answers on its own, derived from what the route declares, so handlers document only their
 * domain errors. CSRF guards every unsafe method once a session exists (`@Public()` routes too); a public policy hides
 * what it refuses behind 404, and `everyone` never refuses.
 */
export const standardErrorsOf = (route: RouteContract): ErrorCode[] => {
    const scope = route.policy?.scope;
    const isSignedIn = scope !== undefined && scope !== 'public';
    const canRefuse = isSignedIn && (route.hasPathParams || !route.isOpenToEveryone);
    const rules: readonly [boolean, ErrorCode][] = [
        [route.hasBody || route.hasQuery, 'VALIDATION_FAILED'],
        [route.hasBody, 'MALFORMED_REQUEST'],
        [route.hasPathParams || route.isPageable || route.isIdempotent, 'INVALID_PARAMETER'],
        [isSignedIn, 'UNAUTHORIZED'],
        [scope !== undefined, 'SESSION_EXPIRED'],
        [!SAFE_METHODS.has(route.method) || canRefuse, 'FORBIDDEN'],
        [scope === 'verified', 'EMAIL_NOT_VERIFIED'],
        [route.isDemoRestricted, 'DEMO_RESTRICTED'],
        [route.hasPathParams, 'RESOURCE_NOT_FOUND'],
        [route.isIdempotent, 'IDEMPOTENCY_KEY_REUSED'],
        [route.isRateLimited, 'RATE_LIMIT_EXCEEDED'],
    ];
    return rules.flatMap(([applies, code]) => (applies ? [code] : []));
};
