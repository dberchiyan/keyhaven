import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';

import { AppConfigService } from '@/common/config/app-config.service';
import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt } from '@/common/idempotency/idempotent.decorator';
import { RateLimit, RateLimitName } from '@/common/security/rate-limit';
import { clientIp, clientUserAgent, readCookie } from '@/common/security/request-client';
import { Public } from '@/common/security/security.decorators';
import { SessionCookies } from '@/common/security/session-cookies';

import { AccountService } from '../service/account.service';
import { CurrentUserResponse } from './dto/current-user.response';
import { RegisterRequest } from './dto/register.request';
import { toCurrentUserResponse } from './mapper/current-user.mapper';

@ApiTags('Auth')
@Controller('api/v1/registrations')
export class RegistrationController {
    constructor(
        private readonly accountService: AccountService,
        private readonly sessionCookies: SessionCookies,
        private readonly config: AppConfigService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @Public()
    @IdempotencyExempt('No session yet; a repeat is refused on the taken email (409), never creates twice')
    @RateLimit(RateLimitName.REGISTRATION)
    @ApiOperation({
        summary: 'Create a tenant or landlord account, sign it in and send the email verification link',
    })
    @ZodResponse({ status: HttpStatus.OK, type: CurrentUserResponse })
    @ApiErrors('VALIDATION_FAILED', 'MALFORMED_REQUEST', 'CONFLICT', 'RATE_LIMIT_EXCEEDED')
    async register(
        @Body() request: RegisterRequest,
        @Req() httpRequest: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<CurrentUserResponse> {
        const { user, session } = await this.accountService.register({
            firstName: request.firstName,
            lastName: request.lastName,
            email: request.email,
            password: request.password,
            role: request.role,
            ip: clientIp(httpRequest),
            userAgent: clientUserAgent(httpRequest),
            presentedToken: readCookie(httpRequest, this.config.get('SESSION_COOKIE_NAME')),
        });
        this.sessionCookies.write(response, session);
        return toCurrentUserResponse(
            user,
            this.config.get('SESSION_IDLE_TIMEOUT_MINUTES'),
            this.config.isDemoProtected(user.email),
            this.config.isDemo,
        );
    }
}
