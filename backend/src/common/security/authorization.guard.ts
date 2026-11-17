import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { type RequestContext, SessionState } from '../context/request-context';
import { isUuid } from '../dto/uuid-param';
import {
    EmailNotVerifiedException,
    InvalidParameterException,
    NotAuthenticatedException,
    SessionExpiredException,
} from '../exception/api.exception';
import { PermissionService } from './permission.service';
import type { Policy, PolicyArgs } from './policy';
import { POLICY_KEY, PUBLIC_KEY } from './security.decorators';

/**
 * Deny by default: a handler runs only if it is public or its policy passes. Routes in the
 * `verified` scope also need a verified email address.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly cls: ClsService<RequestContext>,
        private readonly permissions: PermissionService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const handler = context.getHandler();
        if (this.reflector.get<boolean | undefined>(PUBLIC_KEY, handler) === true) {
            return true;
        }
        const requiredPolicy = this.reflector.get<Policy | undefined>(POLICY_KEY, handler);
        if (!requiredPolicy) {
            return false;
        }
        const principal = this.cls.get('principal') ?? null;
        if (requiredPolicy.scope !== 'public') {
            if (!principal) {
                throw this.cls.get('sessionState') === SessionState.EXPIRED
                    ? new SessionExpiredException()
                    : new NotAuthenticatedException();
            }
            if (requiredPolicy.scope === 'verified' && !principal.isEmailVerified) {
                // Actions other people rely on wait for a verified address (policy.ts → PolicyScope).
                throw new EmailNotVerifiedException();
            }
        }
        const request = context.switchToHttp().getRequest<Request>();
        // Policy params are path ids: anything but a UUID is 400 before a policy queries with it.
        const args: PolicyArgs = Object.fromEntries(
            requiredPolicy.params.map((name) => {
                const value: unknown = Reflect.get(request.params, name);
                if (!isUuid(value)) {
                    throw new InvalidParameterException(name);
                }
                return [name, value.toLowerCase()];
            }),
        );
        if (requiredPolicy.scope === 'public') {
            return requiredPolicy.check(principal, args, this.permissions);
        }
        if (!principal) {
            throw new NotAuthenticatedException();
        }
        return requiredPolicy.check(principal, args, this.permissions);
    }
}
