import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt } from '@/common/idempotency/idempotent.decorator';
import { can } from '@/common/security/policies';
import { Authorize } from '@/common/security/security.decorators';

import { ViewingJobService } from '../service/viewing-job.service';
import { JobRunResponse } from './dto/viewing.response';

/** The hourly viewing jobs, run now by an admin — the same runs, under the same locks, as the scheduler's. */
@ApiTags('Viewings')
@Controller('api/v1')
export class ViewingJobController {
    constructor(private readonly viewingJobService: ViewingJobService) {}

    @Post('viewing-expiry-runs')
    @HttpCode(HttpStatus.OK)
    @Authorize(can.admin)
    @IdempotencyExempt('A repeat finds nothing to expire: an expired request is no longer REQUESTED')
    @ApiOperation({
        summary: 'Expire the requests whose slot started unanswered, now (admins); the scheduler does it hourly',
    })
    @ZodResponse({ status: HttpStatus.OK, type: JobRunResponse })
    @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
    async expire(): Promise<JobRunResponse> {
        const count = await this.viewingJobService.runExpiry(new Date());
        return { isSkipped: count === undefined, count: count ?? 0 };
    }

    @Post('viewing-reminder-runs')
    @HttpCode(HttpStatus.OK)
    @Authorize(can.admin)
    @IdempotencyExempt('A repeat sends nothing: a viewing is marked reminded before its emails go out')
    @ApiOperation({
        summary: 'Send the day-before viewing reminders now (admins); the scheduler does it hourly',
    })
    @ZodResponse({ status: HttpStatus.OK, type: JobRunResponse })
    @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
    async remind(): Promise<JobRunResponse> {
        const count = await this.viewingJobService.runReminders(new Date());
        return { isSkipped: count === undefined, count: count ?? 0 };
    }
}
