import { Injectable } from '@nestjs/common';

import { BusinessRuleException } from '@/common/exception/api.exception';
import { UserService } from '@/modules/user/service/user.service';

import { AccountTokenRepository } from '../repository/account-token.repository';
import type { AccountSession } from './account.types';
import { PasswordHasher } from './password-hasher.service';
import { SessionService } from './session.service';

/**
 * DATA-23: what the auth module holds about a person — sessions and emailed links — for the privacy
 * module's export and erasure (CORE-16: exported, so privacy never reaches into auth's repositories).
 */
@Injectable()
export class AccountPrivacyService {
    constructor(
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly passwordHasher: PasswordHasher,
        private readonly accountTokenRepository: AccountTokenRepository,
    ) {}

    async findSessions(userId: string): Promise<AccountSession[]> {
        const sessions = await this.sessionService.listLive(userId);
        return sessions.map((session) => ({
            createdAt: session.createdAt,
            lastSeenAt: session.lastSeenAt,
            ip: session.ip,
            userAgent: session.userAgent,
        }));
    }

    /**
     * AUTH-4: an irreversible action asks for the password again; a wrong one answers like the
     * change-password check (422 on the named field), and the route's limiter counts the guesses.
     */
    async assertPassword(userId: string, password: string, field: string): Promise<void> {
        const credentials = await this.userService.findCredentialsById(userId);
        if (!credentials || !(await this.passwordHasher.verify(credentials.passwordHash, password))) {
            throw new BusinessRuleException('errors.auth.currentPasswordWrong', {}, field);
        }
    }

    /** DATA-11: CPU work, done before the erasing transaction opens. */
    unusablePasswordHash(): Promise<string> {
        return this.passwordHasher.hashUnusable();
    }

    /** Every session and every emailed link of the person ends; joins the caller's transaction. */
    async endAccess(userId: string): Promise<void> {
        await this.sessionService.endAllForUsers([userId]);
        await this.accountTokenRepository.deleteByUser(userId);
    }
}
