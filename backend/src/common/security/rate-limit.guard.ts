import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';

import type { RequestContext } from '../context/request-context';
import { loginRateLimitKey, RATE_LIMIT_KEY, RateLimitName } from './rate-limit';
import { RateLimitService } from './rate-limit.service';
import { clientIp } from './request-client';

const readBodyField = (body: unknown, field: string): unknown =>
    typeof body === 'object' && body !== null && field in body ? (Reflect.get(body, field) as unknown) : undefined;

const IP_KEYED_LIMITS: ReadonlySet<RateLimitName> = new Set([
    RateLimitName.REGISTRATION,
    RateLimitName.PASSWORD_RESET_REQUEST,
    RateLimitName.TOKEN_REDEMPTION,
]);

const USER_KEYED_LIMITS: ReadonlySet<RateLimitName> = new Set([
    RateLimitName.PASSWORD_CHANGE,
    RateLimitName.EMAIL_VERIFICATION_REQUEST,
]);

/**
 * AUTH-6: public endpoints are limited by the client IP (no session exists yet), account actions by the user; every
 * other route gets the per-session ceiling, or the same ceiling keyed by the visitor's address on public routes.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rateLimitService: RateLimitService,
        private readonly cls: ClsService<RequestContext>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const name = this.reflector.get<RateLimitName | undefined>(RATE_LIMIT_KEY, context.getHandler());
        if (name === RateLimitName.LOGIN) {
            const body: unknown = request.body;
            await this.rateLimitService.consume(
                name,
                loginRateLimitKey(clientIp(request), readBodyField(body, 'email')),
            );
            return true;
        }
        if (name && IP_KEYED_LIMITS.has(name)) {
            await this.rateLimitService.consume(name, [clientIp(request)]);
            return true;
        }
        const principal = this.cls.get('principal');
        if (name && USER_KEYED_LIMITS.has(name) && principal) {
            await this.rateLimitService.consume(name, [principal.userId]);
            return true;
        }
        if (principal) {
            await this.rateLimitService.consumeSession(principal.sessionId);
        } else {
            await this.rateLimitService.consumeVisitor(clientIp(request));
        }
        return true;
    }
}
