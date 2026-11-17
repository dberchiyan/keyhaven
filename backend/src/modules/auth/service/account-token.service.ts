import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { generateToken, hashToken } from '../../../common/security/token-hash';
import { AccountTokenRepository } from '../repository/account-token.repository';
import type { TokenPurpose } from './token-purpose';

const HOUR_MS = 3_600_000;

/** How long each kind of emailed link stays valid (product decision). */
const TOKEN_LIFETIME_MS: Readonly<Record<TokenPurpose, number>> = {
    EMAIL_VERIFICATION: 24 * HOUR_MS,
    PASSWORD_RESET: 1 * HOUR_MS,
};

/**
 * One-time tokens behind emailed links (security.md → Sessions applies: 32 random bytes, only
 * the SHA-256 is stored). Issuing a new token for a purpose replaces the user's older ones;
 * redeeming one spends every token of that purpose.
 */
@Injectable()
export class AccountTokenService {
    constructor(
        private readonly accountTokenRepository: AccountTokenRepository,
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
            expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS[purpose]),
        });
        return token;
    }

    /** The user a live token of this purpose belongs to, or null (unknown, wrong purpose, expired). */
    async resolve(token: string, purpose: TokenPurpose): Promise<string | null> {
        const row = await this.accountTokenRepository.findByTokenHash(hashToken(token));
        if (!row || row.purpose !== purpose || row.expiresAt.getTime() <= Date.now()) {
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
        const count = await this.accountTokenRepository.deleteExpired(new Date());
        this.logger.info({ count }, 'Expired account tokens deleted');
    }
}
