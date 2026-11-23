import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Put, Query, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';

import { AppConfigService } from '@/common/config/app-config.service';
import { ApiPageable, type Pageable, PageableQuery } from '@/common/dto/pageable';
import { SecurityLogQuery, toSecurityEventPage } from '@/common/dto/security-event.response';
import { UuidParam } from '@/common/dto/uuid-param';
import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt } from '@/common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { DemoRestricted } from '@/common/security/demo.guard';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { RateLimit, RateLimitName } from '@/common/security/rate-limit';
import { clientIp, clientUserAgent, readCookie } from '@/common/security/request-client';
import { Authorize, Public } from '@/common/security/security.decorators';
import { SessionCookies } from '@/common/security/session-cookies';

import { AuthService } from '../service/auth.service';
import { SessionService } from '../service/session.service';
import { ChangePasswordRequest } from './dto/change-password.request';
import { CurrentUserResponse } from './dto/current-user.response';
import { LoginRequest } from './dto/login.request';
import { SecurityLogResponse } from './dto/security-log.response';
import { SESSIONS_PAGEABLE, type SessionSortField, SessionsResponse } from './dto/sessions.response';
import { UpdateOwnNameRequest } from './dto/update-own-name.request';
import { toCurrentUserResponse } from './mapper/current-user.mapper';
import { toSessionsResponse } from './mapper/session.mapper';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly sessionService: SessionService,
        private readonly sessionCookies: SessionCookies,
        private readonly config: AppConfigService,
    ) {}

    @Post('login')
    @Public()
    @IdempotencyExempt('No session yet; a repeat only replaces the session')
    @RateLimit(RateLimitName.LOGIN)
    @ApiOperation({ summary: 'Sign in with email and password and start a session', operationId: 'signIn' })
    @ZodResponse({ status: HttpStatus.OK, type: CurrentUserResponse })
    @ApiErrors('INVALID_CREDENTIALS')
    async login(
        @Body() request: LoginRequest,
        @Req() httpRequest: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<CurrentUserResponse> {
        const { user, session } = await this.authService.login({
            email: request.email,
            password: request.password,
            ip: clientIp(httpRequest),
            userAgent: clientUserAgent(httpRequest),
            presentedToken: readCookie(httpRequest, this.config.get('SESSION_COOKIE_NAME')),
        });
        this.sessionCookies.write(response, session);
        return this.toResponse(user);
    }

    @Post('logout')
    @Authorize(can.ownAccount)
    @IdempotencyExempt('Deleting the session is idempotent by nature')
    @ApiOperation({ summary: 'End the current session', operationId: 'signOut' })
    @ApiOkResponse({ description: 'Session ended; cookies cleared' })
    async logout(
        @CurrentPrincipal() principal: Principal,
        @Res({ passthrough: true }) response: Response,
    ): Promise<void> {
        await this.authService.logout(principal.sessionId, principal.userId);
        this.sessionCookies.clear(response);
    }

    @Get('me')
    @Authorize(can.ownAccount)
    @ApiOperation({ summary: 'Return the signed-in user', operationId: 'findCurrentUser' })
    @ZodResponse({ status: HttpStatus.OK, type: CurrentUserResponse })
    async me(@CurrentPrincipal() principal: Principal): Promise<CurrentUserResponse> {
        return this.toResponse(await this.authService.currentUser(principal.userId));
    }

    @Put('password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.ownAccount)
    @DemoRestricted()
    @RateLimit(RateLimitName.PASSWORD_CHANGE)
    @ApiOperation({
        summary: 'Change own password; every session ends and this browser gets a new one',
        operationId: 'changePassword',
    })
    @ApiErrors('BUSINESS_RULE_VIOLATION')
    async changePassword(
        @Body() request: ChangePasswordRequest,
        @CurrentPrincipal() principal: Principal,
        @Req() httpRequest: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<void> {
        const session = await this.authService.changePassword({
            userId: principal.userId,
            currentPassword: request.currentPassword,
            newPassword: request.newPassword,
            ip: clientIp(httpRequest),
            userAgent: clientUserAgent(httpRequest),
        });
        this.sessionCookies.write(response, session);
    }

    @Put('profile')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.ownAccount)
    @ApiOperation({ summary: 'Change own first and last name', operationId: 'updateOwnName' })
    async updateOwnName(
        @Body() request: UpdateOwnNameRequest,
        @CurrentPrincipal() principal: Principal,
    ): Promise<void> {
        await this.authService.updateOwnName(principal.userId, {
            firstName: request.firstName,
            lastName: request.lastName,
        });
    }

    @Get('sessions')
    @Authorize(can.ownAccount)
    @ApiOperation({
        summary: "The caller's current session and a page of their other live sessions",
        operationId: 'listSessions',
    })
    @ApiPageable(SESSIONS_PAGEABLE)
    @ZodResponse({ status: HttpStatus.OK, type: SessionsResponse })
    async sessions(
        @CurrentPrincipal() principal: Principal,
        @PageableQuery(SESSIONS_PAGEABLE) pageable: Pageable<SessionSortField>,
    ): Promise<SessionsResponse> {
        return toSessionsResponse(
            await this.sessionService.listForUser(principal.userId, principal.sessionId, pageable),
        );
    }

    @Delete('sessions')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.ownAccount)
    @DemoRestricted()
    @ApiOperation({ summary: 'Sign out everywhere except this session', operationId: 'endOtherSessions' })
    async endOtherSessions(@CurrentPrincipal() principal: Principal): Promise<void> {
        await this.authService.endOtherSessions(principal.sessionId, principal.userId);
    }

    @Delete('sessions/:sessionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.endOwnSession)
    @DemoRestricted()
    @ApiOperation({ summary: 'End one of own sessions (this one signs out here)', operationId: 'endSession' })
    async endSession(
        @UuidParam('sessionId') sessionId: string,
        @CurrentPrincipal() principal: Principal,
        @Res({ passthrough: true }) response: Response,
    ): Promise<void> {
        await this.authService.endSession(sessionId, principal.sessionId, principal.userId);
        if (sessionId === principal.sessionId) {
            this.sessionCookies.clear(response);
        }
    }

    @Get('security-log')
    @Authorize(can.ownAccount)
    @ApiOperation({
        summary:
            "The caller's security log, newest first by cursor (`after` from the previous page's `nextCursor`): sign-ins, failed sign-ins, password changes, ended sessions",
        operationId: 'findSecurityLog',
    })
    @ZodResponse({ status: HttpStatus.OK, type: SecurityLogResponse })
    async securityLog(
        @CurrentPrincipal() principal: Principal,
        @Query() query: SecurityLogQuery,
    ): Promise<SecurityLogResponse> {
        return toSecurityEventPage(
            await this.authService.securityLog(principal.userId, query.category, query.after, query.size),
        );
    }

    private toResponse(user: Parameters<typeof toCurrentUserResponse>[0]): CurrentUserResponse {
        return toCurrentUserResponse(
            user,
            this.config.get('SESSION_IDLE_TIMEOUT_MINUTES'),
            this.config.isDemoProtected(user.email),
            this.config.isDemo,
        );
    }
}
