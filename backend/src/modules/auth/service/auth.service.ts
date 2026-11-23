import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import type { Cursor } from '@/common/dto/cursor';
import { InvalidCredentialsException, NotAuthenticatedException } from '@/common/exception/api.exception';
import { MetricsService } from '@/common/observability/metrics.service';
import { loginRateLimitKey, RateLimitName } from '@/common/security/rate-limit';
import { RateLimitService } from '@/common/security/rate-limit.service';
import { AuditService } from '@/modules/audit/service/audit.service';
import type { SecurityEventPage } from '@/modules/audit/service/audit.types';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue, changeOf } from '@/modules/audit/service/audit-change';
import type { SecurityCategory } from '@/modules/audit/service/security-category';
import { UserService } from '@/modules/user/service/user.service';
import type { UserProfile } from '@/modules/user/service/user.types';
import { authoritiesFor, type UserRole } from '@/modules/user/service/user-role';

import { AuthError } from './auth-errors';
import { PasswordHasher } from './password-hasher.service';
import { SessionService, type StartedSession } from './session.service';

export interface LoginCommand {
    email: string;
    password: string;
    ip: string;
    userAgent: string | null;
    presentedToken: string | undefined;
}

export interface ChangePasswordCommand {
    userId: string;
    currentPassword: string;
    newPassword: string;
    ip: string;
    userAgent: string | null;
}

export interface UpdateOwnNameCommand {
    firstName: string;
    lastName: string;
}

export interface LoginResult {
    user: UserProfile;
    session: StartedSession;
}

/** Sign-in, sign-out, the own account (password, name, sessions, security log). */
@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly passwordHasher: PasswordHasher,
        private readonly auditService: AuditService,
        private readonly rateLimitService: RateLimitService,
        private readonly metrics: MetricsService,
        @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * AUTH-4: an unknown email runs a dummy verification, so timing reveals no account. A wrong password for a real
     * account goes to its owner's security log; when that was the last allowed try from this IP, the lock is logged
     * too (AUTH-6).
     */
    async login(input: LoginCommand): Promise<LoginResult> {
        const command = { ...input, email: input.email.toLowerCase() };
        const credentials = await this.userService.findCredentialsByEmail(command.email);
        if (!credentials) {
            await this.passwordHasher.verifyDummy(command.password);
            throw this.loginFailed(command);
        }
        if (!(await this.passwordHasher.verify(credentials.passwordHash, command.password))) {
            await this.security(AuditAction.AUTH_SIGN_IN_FAILED, credentials.id, null);
            if (
                await this.rateLimitService.isExhausted(
                    RateLimitName.LOGIN,
                    loginRateLimitKey(command.ip, command.email),
                )
            ) {
                await this.security(AuditAction.AUTH_SIGN_IN_LOCKED, credentials.id, null);
            }
            throw this.loginFailed(command);
        }
        if (this.passwordHasher.needsRehash(credentials.passwordHash)) {
            await this.userService.updatePasswordHash(credentials.id, await this.passwordHasher.hash(command.password));
        }
        const session = await this.startSession(credentials, command);
        const user = await this.currentUser(credentials.id);
        await this.rateLimitService.reset(RateLimitName.LOGIN, loginRateLimitKey(command.ip, command.email));
        this.logger.info({ userId: credentials.id, ip: command.ip }, 'Login succeeded');
        return { user, session };
    }

    /**
     * The session and its security-log entry, together (sign-in, registration, a password reset —
     * the caller's transaction is joined).
     */
    @Transactional()
    async startSession(
        user: { id: string; role: UserRole },
        command: Pick<LoginCommand, 'ip' | 'userAgent' | 'presentedToken'>,
    ): Promise<StartedSession> {
        const session = await this.sessionService.start({
            userId: user.id,
            authorities: authoritiesFor(user.role),
            ip: command.ip,
            userAgent: command.userAgent,
            presentedToken: command.presentedToken,
        });
        await this.security(AuditAction.AUTH_SIGNED_IN, user.id, user.id);
        if (session.evicted > 0) {
            await this.security(AuditAction.AUTH_SESSION_EVICTED, user.id, user.id);
        }
        return session;
    }

    /**
     * Changes the caller's password. The current one is checked first (rate-limited per user);
     * then every session of the user ends — this browser gets a fresh one (AUTH-3). DATA-11: the new hash is
     * computed before the transaction opens.
     */
    async changePassword(command: ChangePasswordCommand): Promise<StartedSession> {
        const credentials = await this.userService.findCredentialsById(command.userId);
        if (!credentials || !(await this.passwordHasher.verify(credentials.passwordHash, command.currentPassword))) {
            this.logger.warn({ userId: command.userId, ip: command.ip }, 'Password change refused');
            throw AuthError.currentPasswordWrong();
        }
        if (command.currentPassword === command.newPassword) {
            throw AuthError.samePassword();
        }
        const passwordHash = await this.passwordHasher.hash(command.newPassword);
        const session = await this.replacePassword(credentials, passwordHash, command);
        await this.rateLimitService.reset(RateLimitName.PASSWORD_CHANGE, [credentials.id]);
        this.logger.info({ userId: credentials.id, ip: command.ip }, 'Password changed');
        return session;
    }

    @Transactional()
    async logout(sessionId: string, userId: string): Promise<void> {
        await this.sessionService.end(sessionId);
        await this.security(AuditAction.AUTH_SIGNED_OUT, userId, userId);
    }

    /** Ends one of the caller's sessions (the policy checked it is theirs); ending the current one signs out. */
    @Transactional()
    async endSession(sessionId: string, currentSessionId: string, userId: string): Promise<void> {
        await this.sessionService.end(sessionId);
        await this.security(
            sessionId === currentSessionId ? AuditAction.AUTH_SIGNED_OUT : AuditAction.AUTH_SESSION_ENDED,
            userId,
            userId,
        );
    }

    /** Signs the caller out everywhere else; logged when anything ended. */
    @Transactional()
    async endOtherSessions(currentSessionId: string, userId: string): Promise<void> {
        if ((await this.sessionService.endOthers(userId, currentSessionId)) > 0) {
            await this.security(AuditAction.AUTH_OTHER_SESSIONS_ENDED, userId, userId);
        }
    }

    /**
     * The caller renames themselves. The same name writes nothing and logs nothing; a change is
     * logged as `user.updated` with both values.
     */
    @Transactional()
    async updateOwnName(userId: string, command: UpdateOwnNameCommand): Promise<void> {
        const before = await this.currentUser(userId);
        const changes = [
            ...changeOf(AuditField.FIRST_NAME, auditValue.text(before.firstName), auditValue.text(command.firstName)),
            ...changeOf(AuditField.LAST_NAME, auditValue.text(before.lastName), auditValue.text(command.lastName)),
        ];
        if (changes.length === 0) {
            return;
        }
        await this.userService.updateName(userId, command);
        await this.auditService.record({
            action: AuditAction.USER_UPDATED,
            actorUserId: userId,
            target: {
                type: AuditTargetType.USER,
                id: userId,
                label: `${command.firstName} ${command.lastName}`,
            },
            subjectId: null,
            changes,
        });
    }

    /** The caller's security log, newest first. */
    securityLog(
        userId: string,
        category: SecurityCategory | undefined,
        after: Cursor | undefined,
        size: number,
    ): Promise<SecurityEventPage> {
        return this.auditService.findSecurityPage(userId, category, after, size);
    }

    /** One security-log entry about `userId`; IP and browser come from the request context. */
    security(action: AuditAction, userId: string, actorUserId: string | null): Promise<void> {
        return this.auditService.record({
            action,
            actorUserId,
            target: { type: AuditTargetType.USER, id: userId, label: 'account' },
            subjectId: null,
            changes: [],
        });
    }

    /** Sessions cascade with their user, so a missing user only happens in a race with deletion. */
    async currentUser(userId: string): Promise<UserProfile> {
        const user = await this.userService.findProfileById(userId);
        if (!user) {
            throw new NotAuthenticatedException();
        }
        return user;
    }

    /** The new hash, every old session gone and a new one for this browser — all or nothing. */
    @Transactional()
    private async replacePassword(
        user: { id: string; role: UserRole },
        passwordHash: string,
        command: Pick<ChangePasswordCommand, 'ip' | 'userAgent'>,
    ): Promise<StartedSession> {
        await this.userService.updatePasswordHash(user.id, passwordHash);
        await this.sessionService.endAllForUsers([user.id]);
        const session = await this.sessionService.start({
            userId: user.id,
            authorities: authoritiesFor(user.role),
            ip: command.ip,
            userAgent: command.userAgent,
            presentedToken: undefined,
        });
        await this.security(AuditAction.AUTH_PASSWORD_CHANGED, user.id, user.id);
        return session;
    }

    private loginFailed(command: LoginCommand): InvalidCredentialsException {
        this.metrics.failedLogins.inc();
        this.logger.warn({ email: command.email, ip: command.ip }, 'Login failed');
        return new InvalidCredentialsException();
    }
}
