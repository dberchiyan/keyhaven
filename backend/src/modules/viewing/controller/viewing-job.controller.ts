import { Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { IdempotencyExempt } from '@/common/idempotency/idempotent.decorator';
import { can } from '@/common/security/policies';
import { Authorize } from '@/common/security/security.decorators';
import { Clock } from '@/common/time/clock';

import { ViewingJobService } from '../service/viewing-job.service';
import { JobRunResponse } from './dto/viewing.response';

/** The hourly viewing jobs, run now by an admin — the same runs, under the same locks, as the scheduler's. */
@ApiTags('Viewings')
@Controller('api/v1')
export class ViewingJobController {
    constructor(
        private readonly viewingJobService: ViewingJobService,
        private readonly clock: Clock,
    ) {}

    @Post('viewing-expiry-runs')
    @Authorize(can.admin)
    @IdempotencyExempt('A repeat finds nothing to expire: an expired request is no longer REQUESTED')
    @ApiOperation({
        summary: 'Expire the requests whose slot started unanswered, now (admins); the scheduler does it hourly',
        operationId: 'runViewingExpiry',
    })
    @ZodResponse({ status: HttpStatus.OK, type: JobRunResponse })
    async expire(): Promise<JobRunResponse> {
        const count = await this.viewingJobService.runExpiry(this.clock.now());
        return { isSkipped: count === undefined, count: count ?? 0 };
    }

    @Post('viewing-reminder-runs')
    @Authorize(can.admin)
    @IdempotencyExempt('A repeat sends nothing: a viewing is marked reminded before its emails go out')
    @ApiOperation({
        summary: 'Send the day-before viewing reminders now (admins); the scheduler does it hourly',
        operationId: 'runViewingReminders',
    })
    @ZodResponse({ status: HttpStatus.OK, type: JobRunResponse })
    async remind(): Promise<JobRunResponse> {
        const count = await this.viewingJobService.runReminders(this.clock.now());
        return { isSkipped: count === undefined, count: count ?? 0 };
    }
}
