import {
    type CallHandler,
    type ExecutionContext,
    HttpStatus,
    Injectable,
    type NestInterceptor,
    RequestMethod,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

/**
 * API-4: a POST answers 200 unless its handler names another code with `@HttpCode` — Nest's default is 201, but
 * our POSTs are commands and decisions, not "created at a URL". The status is set before the handler runs, so a
 * handler writing its own response (`@Res()`) or a replayed idempotent answer still decides last.
 */
@Injectable()
export class PostStatusInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }
        const http = context.switchToHttp();
        const isPost = http.getRequest<Request>().method === RequestMethod[RequestMethod.POST];
        if (isPost && this.reflector.get<number | undefined>(HTTP_CODE_METADATA, context.getHandler()) === undefined) {
            http.getResponse<Response>().status(HttpStatus.OK);
        }
        return next.handle();
    }
}
