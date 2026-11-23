import { createHash } from 'node:crypto';
import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { catchError, from, type Observable, of, switchMap, throwError } from 'rxjs';

import type { RequestContext } from '../context/request-context';
import {
    IdempotencyKeyReusedException,
    InvalidParameterException,
    NotAuthenticatedException,
    RequestInProgressException,
} from '../exception/api.exception';
import { MetricsService } from '../observability/metrics.service';
import { type ClaimResult, IdempotencyKeyStore } from '../persistence/idempotency-key.store';
import { Clock } from '../time/clock';
import { MS_PER_DAY } from '../time/units';
import { IDEMPOTENCY_HEADER, IDEMPOTENCY_REDACT_KEY, IDEMPOTENT_KEY } from './idempotent.decorator';

const KEY_TTL_MS = MS_PER_DAY;
const ENDPOINT_MAX_LENGTH = 255;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The body as stored for replay: redacted top-level fields become null. */
const storable = (body: unknown, redact: readonly string[]): unknown =>
    redact.length === 0 || typeof body !== 'object' || body === null || Array.isArray(body)
        ? body
        : Object.fromEntries(Object.entries(body).map(([key, value]) => [key, redact.includes(key) ? null : value]));

const endpointOf = (request: Request): string => {
    const route: unknown = request.route;
    const path =
        typeof route === 'object' && route !== null && 'path' in route && typeof route.path === 'string'
            ? route.path
            : request.path;
    return `${request.method} ${path}`.slice(0, ENDPOINT_MAX_LENGTH);
};

/** API-5: claim before executing, store after, replay on repeat. */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly store: IdempotencyKeyStore,
        private readonly cls: ClsService<RequestContext>,
        private readonly metrics: MetricsService,
        private readonly clock: Clock,
        @InjectPinoLogger(IdempotencyInterceptor.name) private readonly logger: PinoLogger,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (this.reflector.get<boolean | undefined>(IDEMPOTENT_KEY, context.getHandler()) !== true) {
            return next.handle();
        }
        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        const response = http.getResponse<Response>();
        const key = request.get(IDEMPOTENCY_HEADER);
        if (!key || !UUID.test(key)) {
            throw new InvalidParameterException(IDEMPOTENCY_HEADER);
        }
        const principal = this.cls.get('principal');
        if (!principal) {
            throw new NotAuthenticatedException();
        }
        const redact =
            this.reflector.get<readonly string[] | undefined>(IDEMPOTENCY_REDACT_KEY, context.getHandler()) ?? [];
        const endpoint = endpointOf(request);
        const requestHash = createHash('sha256')
            .update(`${endpoint}\n${JSON.stringify(request.body ?? null)}`)
            .digest('hex');
        const claim = this.store.claim({
            key: key.toLowerCase(),
            userId: principal.userId,
            endpoint,
            requestHash,
            expiresAt: new Date(this.clock.now().getTime() + KEY_TTL_MS),
        });
        return from(claim).pipe(switchMap((result) => this.answer(result, next, response, { endpoint, redact })));
    }

    private answer(
        claim: ClaimResult,
        next: CallHandler,
        response: Response,
        call: { endpoint: string; redact: readonly string[] },
    ): Observable<unknown> {
        switch (claim.outcome) {
            case 'REPLAY':
                this.logger.info({ endpoint: call.endpoint }, 'Idempotent replay');
                response.status(claim.response.statusCode);
                return of(claim.response.body);
            case 'REUSED':
                this.metrics.idempotencyCollisions.inc({ reason: 'reused' });
                return throwError(() => new IdempotencyKeyReusedException());
            case 'IN_PROGRESS':
                this.metrics.idempotencyCollisions.inc({ reason: 'in_progress' });
                return throwError(() => new RequestInProgressException());
            case 'CLAIMED':
                return next.handle().pipe(
                    switchMap((body: unknown) =>
                        from(
                            this.store.complete(claim.id, {
                                statusCode: response.statusCode,
                                body: storable(body, call.redact),
                            }),
                        ).pipe(switchMap(() => of(body))),
                    ),
                    catchError((error: unknown) =>
                        from(this.store.release(claim.id)).pipe(switchMap(() => throwError(() => error))),
                    ),
                );
        }
    }
}
