import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { AppConfigService } from '@/common/config/app-config.service';
import { BusinessConflictException, BusinessRuleException } from '@/common/exception/api.exception';
import type { Principal } from '@/common/security/principal';
import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue, changeOf } from '@/modules/audit/service/audit-change';
import { EmailSender } from '@/modules/email/service/email-sender';
import { UserService } from '@/modules/user/service/user.service';
import type { UserProfile } from '@/modules/user/service/user.types';
import type { UserRole } from '@/modules/user/service/user-role';

import type { EmailVerification, RegisterCommand, ResetPasswordCommand } from './account.types';
import { accountEmails } from './account-emails';
import { AccountTokenService } from './account-token.service';
import { AuthService, type LoginResult } from './auth.service';
import { PasswordHasher } from './password-hasher.service';
import { SessionService } from './session.service';
import { TokenPurpose } from './token-purpose';

const VERIFY_EMAIL_PATH = '/verify-email';
const RESET_PASSWORD_PATH = '/reset-password';

/**
 * The account's life cycle through email: sign-up with its verification link, resending it,
 * verifying, and "forgot password". DATA-12: emails go out after the transaction committed; a failed delivery is logged and the person
 * can ask again — there is no queue yet (jobs module off, a project decision).
 */
@Injectable()
export class AccountService {
    constructor(
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly sessionService: SessionService,
        private readonly passwordHasher: PasswordHasher,
        private readonly accountTokenService: AccountTokenService,
        private readonly auditService: AuditService,
        private readonly emailSender: EmailSender,
        private readonly config: AppConfigService,
        @InjectPinoLogger(AccountService.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * A new tenant or landlord account, signed in at once (unverified: browsing is open, actions
     * other people rely on wait for the verification link). A taken email is refused (409) — that
     * tells the address has an account (accepted; registration is rate-limited per IP). DATA-11: hashing is CPU work,
     * done before the transaction opens.
     */
    async register(command: RegisterCommand): Promise<LoginResult> {
        const email = command.email.toLowerCase();
        if (await this.userService.existsByEmail(email)) {
            throw new BusinessConflictException('errors.registration.emailTaken', {}, 'email');
        }
        const passwordHash = await this.passwordHasher.hash(command.password);
        const { result, token } = await this.createAccount({ ...command, email }, passwordHash);
        this.logger.info({ userId: result.user.id, ip: command.ip }, 'Account registered');
        await this.sendVerification(result.user, token);
        return result;
    }

    /** A fresh verification link for the signed-in caller (the old one stops working). */
    async resendVerification(principal: Principal): Promise<void> {
        const user = await this.authService.currentUser(principal.userId);
        if (user.emailVerifiedAt) {
            throw new BusinessRuleException('errors.verification.alreadyVerified');
        }
        const token = await this.accountTokenService.issue(user.id, TokenPurpose.EMAIL_VERIFICATION);
        await this.sendVerification(user, token);
    }

    /** The link from the email: marks the address verified and spends the link. */
    async verifyEmail(token: string): Promise<EmailVerification> {
        const userId = await this.accountTokenService.resolve(token, TokenPurpose.EMAIL_VERIFICATION);
        if (!userId) {
            throw new BusinessRuleException('errors.verification.invalidLink');
        }
        const user = await this.markVerified(userId);
        return { email: user.email, verifiedAt: user.emailVerifiedAt ?? new Date() };
    }

    /**
     * "Forgot password": always answers the same, whether the address has an account or not
     * (no enumeration; rate-limited per IP). An account gets a one-hour link.
     */
    async requestPasswordReset(rawEmail: string, ip: string): Promise<void> {
        const email = rawEmail.toLowerCase();
        const credentials = await this.userService.findCredentialsByEmail(email);
        if (!credentials) {
            this.logger.info({ ip }, 'Password reset requested for an unknown email');
            return;
        }
        const token = await this.accountTokenService.issue(credentials.id, TokenPurpose.PASSWORD_RESET);
        this.logger.info({ userId: credentials.id, ip }, 'Password reset link issued');
        await this.deliver(
            accountEmails.passwordReset(
                email,
                credentials.firstName,
                `${this.config.get('APP_URL')}${RESET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`,
            ),
        );
    }

    /**
     * The link from the email: a new password, every session of the person ended, this browser
     * signed in. Opening the link also proves the address, so an unverified account becomes
     * verified.
     */
    async resetPassword(command: ResetPasswordCommand): Promise<LoginResult> {
        const userId = await this.accountTokenService.resolve(command.token, TokenPurpose.PASSWORD_RESET);
        if (!userId) {
            throw new BusinessRuleException('errors.verification.invalidLink');
        }
        const credentials = await this.userService.findCredentialsById(userId);
        if (!credentials) {
            throw new BusinessRuleException('errors.verification.invalidLink');
        }
        const passwordHash = await this.passwordHasher.hash(command.newPassword);
        const result = await this.applyReset(credentials, passwordHash, command);
        this.logger.info({ userId, ip: command.ip }, 'Password reset');
        return result;
    }

    @Transactional()
    private async createAccount(
        command: RegisterCommand,
        passwordHash: string,
    ): Promise<{ result: LoginResult; token: string }> {
        const userId = await this.userService.create({
            email: command.email,
            firstName: command.firstName,
            lastName: command.lastName,
            role: command.role,
            passwordHash,
        });
        await this.auditService.record({
            action: AuditAction.USER_REGISTERED,
            actorUserId: userId,
            target: {
                type: AuditTargetType.USER,
                id: userId,
                label: `${command.firstName} ${command.lastName}`,
            },
            changes: changeOf(AuditField.ROLE, null, auditValue.text(command.role)),
        });
        const token = await this.accountTokenService.issue(userId, TokenPurpose.EMAIL_VERIFICATION);
        const session = await this.authService.startSession({ id: userId, role: command.role }, command);
        const user = await this.authService.currentUser(userId);
        return { result: { user, session }, token };
    }

    @Transactional()
    private async markVerified(userId: string): Promise<UserProfile> {
        const now = new Date();
        if (await this.userService.markEmailVerified(userId, now)) {
            await this.authService.security(AuditAction.AUTH_EMAIL_VERIFIED, userId, userId);
        }
        await this.accountTokenService.spend(userId, TokenPurpose.EMAIL_VERIFICATION);
        return this.authService.currentUser(userId);
    }

    @Transactional()
    private async applyReset(
        user: { id: string; role: UserRole },
        passwordHash: string,
        command: ResetPasswordCommand,
    ): Promise<LoginResult> {
        await this.userService.updatePasswordHash(user.id, passwordHash);
        await this.accountTokenService.spend(user.id, TokenPurpose.PASSWORD_RESET);
        if (await this.userService.markEmailVerified(user.id, new Date())) {
            await this.authService.security(AuditAction.AUTH_EMAIL_VERIFIED, user.id, user.id);
        }
        await this.sessionService.endAllForUsers([user.id]);
        await this.authService.security(AuditAction.AUTH_PASSWORD_RESET, user.id, user.id);
        const session = await this.authService.startSession(user, {
            ...command,
            presentedToken: undefined,
        });
        return { user: await this.authService.currentUser(user.id), session };
    }

    private sendVerification(user: { email: string; firstName: string }, token: string): Promise<void> {
        return this.deliver(
            accountEmails.verification(
                user.email,
                user.firstName,
                `${this.config.get('APP_URL')}${VERIFY_EMAIL_PATH}?token=${encodeURIComponent(token)}`,
            ),
        );
    }

    /** After commit. A delivery failure is logged, not surfaced: the person can ask for a new link. */
    private async deliver(message: Parameters<EmailSender['send']>[0]): Promise<void> {
        try {
            await this.emailSender.send(message);
        } catch (error: unknown) {
            this.logger.warn({ err: error, subject: message.subject }, 'Email not delivered');
        }
    }
}
