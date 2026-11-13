import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { AppConfigService } from '../../../common/config/app-config.service';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { IdempotencyExempt } from '../../../common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { RateLimit, RateLimitName } from '../../../common/security/rate-limit';
import { clientIp, clientUserAgent, readCookie } from '../../../common/security/request-client';
import { Authorize, Public } from '../../../common/security/security.decorators';
import { SessionCookies } from '../../../common/security/session-cookies';
import { AccountService } from '../service/account.service';
import { CurrentUserResponse } from './dto/current-user.response';
import { EmailVerificationResponse } from './dto/email-verification.response';
import {
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
} from './dto/password-reset-request.request';
import { ResetPasswordRequest } from './dto/reset-password.request';
import { VerifyEmailRequest } from './dto/verify-email.request';
import { toCurrentUserResponse } from './mapper/current-user.mapper';

/** The emailed links: verifying the address and "forgot password". */
@ApiTags('Auth')
@Controller('api/v1/auth')
export class AccountRecoveryController {
  constructor(
    private readonly accountService: AccountService,
    private readonly sessionCookies: SessionCookies,
    private readonly config: AppConfigService,
  ) {}

  @Post('email-verifications')
  @HttpCode(HttpStatus.OK)
  @Public()
  @IdempotencyExempt('A spent link answers 422; verifying twice changes nothing')
  @RateLimit(RateLimitName.TOKEN_REDEMPTION)
  @ApiOperation({ summary: 'Verify an email address with the token from the verification email' })
  @ZodResponse({ status: HttpStatus.OK, type: EmailVerificationResponse })
  @ApiErrors(
    'VALIDATION_FAILED',
    'MALFORMED_REQUEST',
    'BUSINESS_RULE_VIOLATION',
    'RATE_LIMIT_EXCEEDED',
  )
  async verifyEmail(@Body() request: VerifyEmailRequest): Promise<EmailVerificationResponse> {
    const verification = await this.accountService.verifyEmail(request.token);
    return { email: verification.email, verifiedAt: verification.verifiedAt.toISOString() };
  }

  @Post('email-verification-requests')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.ownAccount)
  @IdempotencyExempt('Rate-limited per user; a new link only replaces the previous one')
  @RateLimit(RateLimitName.EMAIL_VERIFICATION_REQUEST)
  @ApiOperation({ summary: 'Send the signed-in user a new verification email' })
  @ApiOkResponse({ description: 'A new verification email is on its way' })
  @ApiErrors(
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'BUSINESS_RULE_VIOLATION',
    'RATE_LIMIT_EXCEEDED',
  )
  async resendVerification(@CurrentPrincipal() principal: Principal): Promise<void> {
    await this.accountService.resendVerification(principal);
  }

  @Post('password-reset-requests')
  @HttpCode(HttpStatus.OK)
  @Public()
  @IdempotencyExempt('Rate-limited per IP; a new link only replaces the previous one')
  @RateLimit(RateLimitName.PASSWORD_RESET_REQUEST)
  @ApiOperation({
    summary: 'Email a password reset link; answers the same whether the address has an account',
  })
  @ZodResponse({ status: HttpStatus.OK, type: PasswordResetRequestResponse })
  @ApiErrors('VALIDATION_FAILED', 'MALFORMED_REQUEST', 'RATE_LIMIT_EXCEEDED')
  async requestPasswordReset(
    @Body() request: PasswordResetRequestRequest,
    @Req() httpRequest: Request,
  ): Promise<PasswordResetRequestResponse> {
    await this.accountService.requestPasswordReset(request.email, clientIp(httpRequest));
    return { email: request.email.toLowerCase() };
  }

  @Post('password-resets')
  @HttpCode(HttpStatus.OK)
  @Public()
  @IdempotencyExempt('The link is spent on first use; a repeat answers 422')
  @RateLimit(RateLimitName.TOKEN_REDEMPTION)
  @ApiOperation({
    summary:
      'Set a new password with the token from the reset email; every session ends and this browser is signed in',
  })
  @ZodResponse({ status: HttpStatus.OK, type: CurrentUserResponse })
  @ApiErrors(
    'VALIDATION_FAILED',
    'MALFORMED_REQUEST',
    'BUSINESS_RULE_VIOLATION',
    'RATE_LIMIT_EXCEEDED',
  )
  async resetPassword(
    @Body() request: ResetPasswordRequest,
    @Req() httpRequest: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUserResponse> {
    const { user, session } = await this.accountService.resetPassword({
      token: request.token,
      newPassword: request.newPassword,
      ip: clientIp(httpRequest),
      userAgent: clientUserAgent(httpRequest),
      presentedToken: readCookie(httpRequest, this.config.get('SESSION_COOKIE_NAME')),
    });
    this.sessionCookies.write(response, session);
    return toCurrentUserResponse(
      user,
      this.config.get('SESSION_IDLE_TIMEOUT_MINUTES'),
      this.config.isDemoProtected(user.email),
    );
  }
}
