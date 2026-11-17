import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { AppConfigService } from '@/common/config/app-config.service';
import { JobLock } from '@/common/persistence/job-lock';
import { JobName } from '@/common/persistence/job-name';
import { ClientType, Principal } from '@/common/security/principal';
import {
    type SessionAuthentication,
    SessionAuthenticator,
    SessionLookup,
} from '@/common/security/session-authenticator';
import { generateToken, hashToken } from '@/common/security/token-hash';
import { MS_PER_MINUTE } from '@/common/time/units';

import type { SessionListRecord } from '../repository/record/session.record';
import { SessionRepository } from '../repository/session.repository';

const TOUCH_INTERVAL_MS = MS_PER_MINUTE;

export interface StartSessionCommand {
    userId: string;
    authorities: string[];
    ip: string;
    userAgent: string | null;
    presentedToken: string | undefined;
}

export interface StartedSession {
    token: string;
    csrfToken: string;
    absoluteExpiresAt: Date;
    evicted: number;
}

/** AUTH-3: devices a person can be signed in on at once. */
export const MAX_SESSIONS_PER_USER = 10;

@Injectable()
export class SessionService extends SessionAuthenticator {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly config: AppConfigService,
        private readonly jobLock: JobLock,
        @InjectPinoLogger(SessionService.name) private readonly logger: PinoLogger,
    ) {
        super();
    }

    /**
     * AUTH-1: a token presented at login is deleted, never reused (no fixation). AUTH-3: a new sign-in beyond the
     * per-user limit ends the least recently used session.
     */
    @Transactional()
    async start(command: StartSessionCommand): Promise<StartedSession> {
        if (command.presentedToken) {
            await this.sessionRepository.deleteByTokenHash(hashToken(command.presentedToken));
        }
        const token = generateToken();
        const csrfToken = generateToken();
        const now = Date.now();
        const absoluteExpiresAt = new Date(now + this.config.get('SESSION_ABSOLUTE_TIMEOUT_MINUTES') * MS_PER_MINUTE);
        await this.sessionRepository.create({
            userId: command.userId,
            tokenHash: hashToken(token),
            csrfTokenHash: hashToken(csrfToken),
            authorities: command.authorities,
            clientType: ClientType.WEB,
            ip: command.ip,
            userAgent: command.userAgent,
            idleExpiresAt: this.idleExpiry(now, absoluteExpiresAt),
            absoluteExpiresAt,
        });
        const trimmed = await this.sessionRepository.deleteBeyondMostRecent(command.userId, MAX_SESSIONS_PER_USER);
        if (trimmed > 0) {
            this.logger.info({ userId: command.userId, trimmed }, 'Oldest sessions ended (limit)');
        }
        return { token, csrfToken, absoluteExpiresAt, evicted: trimmed };
    }

    /** AUTH-2: last_seen_at is touched at most once a minute, so authentication rarely writes. */
    async authenticate(token: string): Promise<SessionAuthentication> {
        const session = await this.sessionRepository.findForAuthenticationByTokenHash(hashToken(token));
        if (!session) {
            return { result: SessionLookup.UNKNOWN };
        }
        const now = Date.now();
        if (session.idleExpiresAt.getTime() <= now || session.absoluteExpiresAt.getTime() <= now) {
            await this.sessionRepository.deleteById(session.id);
            return { result: SessionLookup.EXPIRED };
        }
        if (now - session.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS) {
            await this.sessionRepository.touch(
                session.id,
                new Date(now),
                this.idleExpiry(now, session.absoluteExpiresAt),
            );
        }
        return {
            result: SessionLookup.VALID,
            principal: new Principal(
                session.userId,
                session.user.email,
                session.user.emailVerifiedAt !== null,
                session.user.agencyId,
                session.id,
                session.authorities,
                session.clientType === ClientType.MOBILE ? ClientType.MOBILE : ClientType.WEB,
                session.csrfTokenHash,
            ),
        };
    }

    end(sessionId: string): Promise<void> {
        return this.sessionRepository.deleteById(sessionId);
    }

    /** Settings: this session, and a page of the user's other live ones (most recent first). */
    async listForUser(
        userId: string,
        currentSessionId: string,
        page: { page: number; size: number },
    ): Promise<{
        current: SessionListRecord | null;
        others: { content: SessionListRecord[]; totalElements: number };
    }> {
        const [current, others] = await Promise.all([
            this.sessionRepository.findListedById(currentSessionId),
            this.sessionRepository.findOtherLivePage(userId, currentSessionId, new Date(), {
                skip: page.page * page.size,
                take: page.size,
            }),
        ]);
        return { current, others };
    }

    /** DATA-23: the person's live sessions for their export — at most MAX_SESSIONS_PER_USER exist. */
    listLive(userId: string): Promise<SessionListRecord[]> {
        return this.sessionRepository.findLiveByUser(userId, new Date(), MAX_SESSIONS_PER_USER);
    }

    /** Signs the user out everywhere but this session. */
    endOthers(userId: string, keepSessionId: string): Promise<number> {
        return this.sessionRepository.deleteByUserIdExcept(userId, keepSessionId);
    }

    /** Signs these users out everywhere (a password change or reset). */
    endAllForUsers(userIds: string[]): Promise<number> {
        return this.sessionRepository.deleteByUserIds(userIds);
    }

    @Cron(CronExpression.EVERY_HOUR)
    async deleteExpired(): Promise<void> {
        await this.jobLock.runExclusive(JobName.DELETE_EXPIRED_SESSIONS, async () => {
            const count = await this.sessionRepository.deleteExpired(new Date());
            this.logger.info({ count }, 'Expired sessions deleted');
        });
    }

    private idleExpiry(now: number, absoluteExpiresAt: Date): Date {
        const idle = now + this.config.get('SESSION_IDLE_TIMEOUT_MINUTES') * MS_PER_MINUTE;
        return new Date(Math.min(idle, absoluteExpiresAt.getTime()));
    }
}
