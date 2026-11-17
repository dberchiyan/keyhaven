import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from '@/common/persistence/prisma.service';

import { type AccountTokenRecord, accountTokenSelect } from './record/account-token.record';

export interface NewAccountToken {
    userId: string;
    purpose: string;
    tokenHash: string;
    expiresAt: Date;
}

@Injectable()
export class AccountTokenRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    async create(token: NewAccountToken): Promise<void> {
        await this.txHost.tx.accountToken.create({ data: token, select: { id: true } });
    }

    findByTokenHash(tokenHash: string): Promise<AccountTokenRecord | null> {
        return this.txHost.tx.accountToken.findUnique({
            where: { tokenHash },
            select: accountTokenSelect,
        });
    }

    /** Every token of the user for one purpose (a new link replaces the old ones; a used one is spent). */
    async deleteByUserAndPurpose(userId: string, purpose: string): Promise<number> {
        const { count } = await this.txHost.tx.accountToken.deleteMany({ where: { userId, purpose } });
        return count;
    }

    async deleteByUser(userId: string): Promise<number> {
        const { count } = await this.txHost.tx.accountToken.deleteMany({ where: { userId } });
        return count;
    }

    async deleteExpired(now: Date): Promise<number> {
        const { count } = await this.txHost.tx.accountToken.deleteMany({
            where: { expiresAt: { lte: now } },
        });
        return count;
    }
}
