import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { JobLock } from '@/common/persistence/job-lock';
import { JobName } from '@/common/persistence/job-name';
import { generateToken, hashToken } from '@/common/security/token-hash';
import { Clock } from '@/common/time/clock';
import { MS_PER_HOUR } from '@/common/time/units';

import { AccountTokenRepository } from '../repository/account-token.repository';
import type { TokenPurpose } from './token-purpose';

const VERIFICATION_LINK_HOURS = 24;

const TOKEN_LIFETIME_MS: Readonly<Record<TokenPurpose, number>> = {
    EMAIL_VERIFICATION: VERIFICATION_LINK_HOURS * MS_PER_HOUR,
    PASSWORD_RESET: MS_PER_HOUR,
};

/**
 * One-time tokens behind emailed links (AUTH-1 applies: 32 random bytes, only the SHA-256 is stored); how long a
 * link stays valid is a product decision. Issuing a new token for a purpose replaces the user's older ones;
 * redeeming one spends every token of that purpose.
 */
@Injectable()
export class AccountTokenService {
    constructor(
        private readonly accountTokenRepository: AccountTokenRepository,
        private readonly jobLock: JobLock,
        private readonly clock: Clock,
        @InjectPinoLogger(AccountTokenService.name) private readonly logger: PinoLogger,
    ) {}

    /** Returns the clear token for the link (never stored). Joins the caller's transaction. */
    @Transactional()
    async issue(userId: string, purpose: TokenPurpose): Promise<string> {
        await this.accountTokenRepository.deleteByUserAndPurpose(userId, purpose);
        const token = generateToken();
        await this.accountTokenRepository.create({
            userId,
            purpose,
            tokenHash: hashToken(token),
            expiresAt: new Date(this.clock.now().getTime() + TOKEN_LIFETIME_MS[purpose]),
        });
        return token;
    }

    /** The user a live token of this purpose belongs to, or null (unknown, wrong purpose, expired). */
    async resolve(token: string, purpose: TokenPurpose): Promise<string | null> {
        const row = await this.accountTokenRepository.findByTokenHash(hashToken(token));
        if (!row || row.purpose !== purpose || row.expiresAt.getTime() <= this.clock.now().getTime()) {
            return null;
        }
        return row.userId;
    }

    /** Spends the user's tokens of this purpose (inside the transaction that acts on the link). */
    async spend(userId: string, purpose: TokenPurpose): Promise<void> {
        await this.accountTokenRepository.deleteByUserAndPurpose(userId, purpose);
    }

    @Cron(CronExpression.EVERY_HOUR)
    async deleteExpired(): Promise<void> {
        await this.jobLock.runExclusive(JobName.DELETE_EXPIRED_ACCOUNT_TOKENS, async () => {
            const count = await this.accountTokenRepository.deleteExpired(this.clock.now());
            this.logger.info({ count }, 'Expired account tokens deleted');
        });
    }
}
