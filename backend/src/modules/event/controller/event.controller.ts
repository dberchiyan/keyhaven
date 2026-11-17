import { Controller, Header, type MessageEvent, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { map, type Observable } from 'rxjs';

import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { SlowThreshold } from '@/common/observability/slow-threshold.decorator';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { Authorize } from '@/common/security/security.decorators';
import { UserRole } from '@/modules/user/service/user-role';

import { EventService } from '../service/event.service';

const NEVER_SLOW_MS = Number.POSITIVE_INFINITY;

/**
 * The live channel: one Server-Sent Events stream per signed-in browser. A stream lives as long as
 * the tab, so its duration is never "slow"; nothing in between may buffer or transform it (nginx
 * honours X-Accel-Buffering).
 */
@ApiTags('Events')
@Controller('api/v1')
export class EventController {
    constructor(private readonly events: EventService) {}

    @Sse('events')
    @Authorize(can.subscribeEvents)
    @SlowThreshold(NEVER_SLOW_MS)
    @Header('Cache-Control', 'no-cache, no-transform')
    @Header('X-Accel-Buffering', 'no')
    @ApiOperation({
        summary:
            'Live events for the caller (Server-Sent Events): new messages, reads, viewing changes, a heartbeat every 25 s',
    })
    @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED')
    stream(@CurrentPrincipal() principal: Principal): Observable<MessageEvent> {
        return this.events
            .subscribe(principal.userId, principal.agencyId, principal.hasAuthority(UserRole.ADMIN))
            .pipe(map((event) => ({ data: event })));
    }
}
