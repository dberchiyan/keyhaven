import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import type { RequestContext } from '../context/request-context';

/**
 * CORE-26: the one source of "now" for services, notifiers and jobs; repositories get it as a parameter. A request has one
 * instant, taken when it enters (the CLS setup) — so every row, email and comparison of one request agrees. It is
 * stored then rather than on the first call, because a `@Transactional()` method runs in a copy of the CLS store and
 * an instant first stored inside it would be lost after the commit. Outside a request (crons, jobs) every call reads
 * the time afresh.
 */
@Injectable()
export class Clock {
    constructor(private readonly cls: ClsService<RequestContext>) {}

    now(): Date {
        const requestedAt = this.cls.isActive() ? this.cls.get('requestedAt') : undefined;
        return requestedAt ?? new Date();
    }
}
