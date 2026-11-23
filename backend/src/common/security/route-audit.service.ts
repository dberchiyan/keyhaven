import { Injectable, type OnApplicationBootstrap, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IDEMPOTENCY_EXEMPT_KEY, IDEMPOTENT_KEY } from '../idempotency/idempotent.decorator';
import type { Policy } from './policy';
import { RouteCatalog, type RouteHandler } from './route-catalog';
import { POLICY_KEY, PUBLIC_KEY } from './security.decorators';

const PATH_ID_PARAM = /Id$/;
const OPERATION_ID = /^[a-z][A-Za-z]+$/;

/**
 * Refuses to boot when a handler breaks the contract (API-1, API-2, API-5, SEC-3, PLAT-6): exactly one of
 * `@Public()` / `@Authorize()`, every path id in the policy, every POST idempotent or exempt, and an explicit, unique,
 * camelCase `operationId` (the generated clients name their calls after it).
 */
@Injectable()
export class RouteAuditService implements OnApplicationBootstrap {
    constructor(
        private readonly routes: RouteCatalog,
        private readonly reflector: Reflector,
    ) {}

    onApplicationBootstrap(): void {
        const routes = this.routes.list();
        const violations = [...routes.flatMap((route) => this.audit(route)), ...duplicateOperationIds(routes)];
        if (violations.length > 0) {
            throw new Error(`Route audit failed:\n${violations.join('\n')}`);
        }
    }

    private audit({ handler, method, route, pathParams, operationId }: RouteHandler): string[] {
        const violations: string[] = [];
        const isPublic = this.reflector.get<boolean | undefined>(PUBLIC_KEY, handler) === true;
        const requiredPolicy = this.reflector.get<Policy | undefined>(POLICY_KEY, handler);
        if (isPublic === (requiredPolicy !== undefined)) {
            violations.push(`${route}: needs exactly one of @Public() / @Authorize()`);
        }
        for (const param of pathParams.filter((name) => PATH_ID_PARAM.test(name))) {
            if (!requiredPolicy?.params.includes(param)) {
                violations.push(`${route}: path parameter ${param} is not checked by the policy`);
            }
        }
        if (
            method === RequestMethod.POST &&
            this.reflector.get<boolean | undefined>(IDEMPOTENT_KEY, handler) !== true &&
            this.reflector.get<string | undefined>(IDEMPOTENCY_EXEMPT_KEY, handler) === undefined
        ) {
            violations.push(`${route}: POST needs @Idempotent() or @IdempotencyExempt(reason)`);
        }
        if (operationId === undefined || !OPERATION_ID.test(operationId)) {
            violations.push(`${route}: needs @ApiOperation({ operationId }) in camelCase, verb first`);
        }
        return violations;
    }
}

const duplicateOperationIds = (routes: readonly RouteHandler[]): string[] => {
    const routesById = new Map<string, string[]>();
    for (const { operationId, route } of routes) {
        if (operationId !== undefined) {
            routesById.set(operationId, [...(routesById.get(operationId) ?? []), route]);
        }
    }
    return [...routesById.entries()]
        .filter(([, sharing]) => sharing.length > 1)
        .map(([operationId, sharing]) => `operationId ${operationId} is used by ${sharing.join(', ')}`);
};
