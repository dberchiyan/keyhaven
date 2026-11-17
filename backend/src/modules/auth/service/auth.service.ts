import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
    BusinessRuleException,
    InvalidCredentialsException,
    NotAuthenticatedException,
} from '../../../common/exception/api.exception';
import type { Pageable } from '../../../common/dto/pageable';
import { MetricsService } from '../../../common/observability/metrics.service';
import type { Principal } from '../../../common/security/principal';
import { loginRateLimitKey, RateLimitName } from '../../../common/security/rate-limit';
import { RateLimitService } from '../../../common/security/rate-limit.service';
import { AuditAction, AuditTargetType } from '../../audit/service/audit-action';
import { AuditField, auditValue, changeOf } from '../../audit/service/audit-change';
import type { AuditEventSortField } from '../../audit/service/audit-sort';
import { AuditService } from '../../audit/service/audit.service';
import type { SecurityEventPage } from '../../audit/service/audit.types';
import type { SecurityCategory } from '../../audit/service/security-category';
import { authoritiesFor, type UserRole } from '../../user/service/user-role';
import { UserService } from '../../user/service/user.service';
import type { UserProfile } from '../../user/service/user.types';
import { PasswordHasher } from './password-hasher.service';
import { type StartedSession, SessionService } from './session.service';

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

    async login(input: LoginCommand): Promise<LoginResult> {
        const command = { ...input, email: input.email.toLowerCase() };
        const credentials = await this.userService.findCredentialsByEmail(command.email);
        // An unknown email runs a dummy verification — no timing oracle (security.md → Passwords).
        if (!credentials) {
            await this.passwordHasher.verifyDummy(command.password);
            throw this.loginFailed(command);
        }
        if (!(await this.passwordHasher.verify(credentials.passwordHash, command.password))) {
            // A wrong password for a real account goes to its owner's security log.
            await this.security(AuditAction.AUTH_SIGN_IN_FAILED, credentials.id, null);
            // That was the last allowed try from this IP: sign-in is now blocked there for a while.
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
     * then every session of the user ends — this browser gets a fresh one (security.md →
     * Passwords: a password change deletes all sessions).
     */
    async changePassword(command: ChangePasswordCommand): Promise<StartedSession> {
        const credentials = await this.userService.findCredentialsById(command.userId);
        if (!credentials || !(await this.passwordHasher.verify(credentials.passwordHash, command.currentPassword))) {
            this.logger.warn({ userId: command.userId, ip: command.ip }, 'Password change refused');
            throw new BusinessRuleException('errors.auth.currentPasswordWrong', {}, 'currentPassword');
        }
        if (command.currentPassword === command.newPassword) {
            throw new BusinessRuleException('errors.auth.samePassword', {}, 'newPassword');
        }
        // Hashing is CPU work, done before the transaction opens.
        const passwordHash = await this.passwordHasher.hash(command.newPassword);
        const session = await this.replacePassword(credentials, passwordHash, command);
        await this.rateLimitService.reset(RateLimitName.PASSWORD_CHANGE, [credentials.id]);
        this.logger.info({ userId: credentials.id, ip: command.ip }, 'Password changed');
        return session;
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

    @Transactional()
    async logout(principal: Principal): Promise<void> {
        await this.sessionService.end(principal.sessionId);
        await this.security(AuditAction.AUTH_SIGNED_OUT, principal.userId, principal.userId);
    }

    /** Ends one of the caller's sessions (the policy checked it is theirs). */
    @Transactional()
    async endSession(principal: Principal, sessionId: string): Promise<void> {
        await this.sessionService.end(sessionId);
        await this.security(
            sessionId === principal.sessionId ? AuditAction.AUTH_SIGNED_OUT : AuditAction.AUTH_SESSION_ENDED,
            principal.userId,
            principal.userId,
        );
    }

    /** Signs the caller out everywhere else; logged when anything ended. */
    @Transactional()
    async endOtherSessions(principal: Principal): Promise<void> {
        if ((await this.sessionService.endOthers(principal.userId, principal.sessionId)) > 0) {
            await this.security(AuditAction.AUTH_OTHER_SESSIONS_ENDED, principal.userId, principal.userId);
        }
    }

    /**
     * The caller renames themselves. The same name writes nothing and logs nothing; a change is
     * logged as `user.updated` with both values.
     */
    @Transactional()
    async updateOwnName(principal: Principal, command: UpdateOwnNameCommand): Promise<void> {
        const before = await this.currentUser(principal.userId);
        const changes = [
            ...changeOf(AuditField.FIRST_NAME, auditValue.text(before.firstName), auditValue.text(command.firstName)),
            ...changeOf(AuditField.LAST_NAME, auditValue.text(before.lastName), auditValue.text(command.lastName)),
        ];
        if (changes.length === 0) {
            return;
        }
        await this.userService.updateName(principal.userId, command);
        await this.auditService.record({
            action: AuditAction.USER_UPDATED,
            actorUserId: principal.userId,
            target: {
                type: AuditTargetType.USER,
                id: principal.userId,
                label: `${command.firstName} ${command.lastName}`,
            },
            changes,
        });
    }

    /** The caller's security log, newest first. */
    securityLog(
        principal: Principal,
        category: SecurityCategory | null,
        pageable: Pageable<AuditEventSortField>,
    ): Promise<SecurityEventPage> {
        return this.auditService.findSecurityPage(principal.userId, category, pageable);
    }

    /** One security-log entry about `userId`; IP and browser come from the request context. */
    security(action: AuditAction, userId: string, actorUserId: string | null): Promise<void> {
        return this.auditService.record({
            action,
            actorUserId,
            target: { type: AuditTargetType.USER, id: userId, label: 'account' },
            changes: [],
        });
    }

    async currentUser(userId: string): Promise<UserProfile> {
        const user = await this.userService.findProfileById(userId);
        if (!user) {
            // Sessions cascade with their user, so this only happens in a race with deletion.
            throw new NotAuthenticatedException();
        }
        return user;
    }

    private loginFailed(command: LoginCommand): InvalidCredentialsException {
        this.metrics.failedLogins.inc();
        this.logger.warn({ email: command.email, ip: command.ip }, 'Login failed');
        return new InvalidCredentialsException();
    }
}
