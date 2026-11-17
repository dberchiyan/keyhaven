import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';

import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt } from '@/common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { DemoRestricted } from '@/common/security/demo.guard';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { RateLimit, RateLimitName } from '@/common/security/rate-limit';
import { Authorize } from '@/common/security/security.decorators';
import { SessionCookies } from '@/common/security/session-cookies';

import { PrivacyService } from '../service/privacy.service';
import { EraseAccountRequest } from './dto/erase-account.request';
import { PersonalDataExportResponse } from './dto/personal-data.response';
import { toPersonalDataExportResponse } from './mapper/personal-data.mapper';

/** DATA-23: the person's own data — a copy, and erasure of the account. */
@ApiTags('Privacy')
@Controller('api/v1/personal-data')
export class PrivacyController {
    constructor(
        private readonly privacyService: PrivacyService,
        private readonly sessionCookies: SessionCookies,
    ) {}

    @Get()
    @Authorize(can.ownAccount)
    @ApiOperation({
        summary:
            "A copy of the caller's personal data: the account, live sessions (at most 10), the newest 500 security-log events, saved homes (500), saved searches (20), viewings as a tenant (500), messages written (2,000), requests to Keyhaven (100) and a landlord's listings (500), newest first",
    })
    @ZodResponse({ status: HttpStatus.OK, type: PersonalDataExportResponse })
    @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED')
    async export(@CurrentPrincipal() principal: Principal): Promise<PersonalDataExportResponse> {
        return toPersonalDataExportResponse(await this.privacyService.export(principal.userId));
    }

    @Post('erasure')
    @HttpCode(HttpStatus.OK)
    @Authorize(can.ownAccount)
    @DemoRestricted()
    @RateLimit(RateLimitName.PASSWORD_CHANGE)
    @IdempotencyExempt('irreversible; it ends every session, so a replay answers 401')
    @ApiOperation({
        summary:
            "Erase the caller's account (password asked again): signed out everywhere, contacts anonymised, saved homes and searches deleted, upcoming viewings cancelled, a landlord's published listings unpublished, messages removed; the security log is kept",
    })
    @ApiOkResponse({ description: 'Account erased; cookies cleared' })
    @ApiErrors(
        'VALIDATION_FAILED',
        'UNAUTHORIZED',
        'SESSION_EXPIRED',
        'FORBIDDEN',
        'BUSINESS_RULE_VIOLATION',
        'RATE_LIMIT_EXCEEDED',
        'DEMO_RESTRICTED',
    )
    async erase(
        @Body() request: EraseAccountRequest,
        @CurrentPrincipal() principal: Principal,
        @Res({ passthrough: true }) response: Response,
    ): Promise<void> {
        await this.privacyService.erase(principal, request.password);
        this.sessionCookies.clear(response);
    }
}
