import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { Prisma } from '@/generated/prisma/client';

import { JobLock } from './job-lock';
import { JobName } from './job-name';
import { PrismaService } from './prisma.service';
import { classifyPrismaError, PrismaErrorKind } from './prisma-error';

export interface StoredResponse {
    statusCode: number;
    body: unknown;
}

export type ClaimResult =
    | { outcome: 'CLAIMED'; id: string }
    | { outcome: 'REPLAY'; response: StoredResponse }
    | { outcome: 'IN_PROGRESS' }
    | { outcome: 'REUSED' };

export interface ClaimRequest {
    key: string;
    userId: string;
    endpoint: string;
    requestHash: string;
    expiresAt: Date;
}

/**
 * The idempotency ledger. Uses the root client on purpose: a claim must commit before the
 * handler's own transaction starts, so a concurrent duplicate sees it.
 */
@Injectable()
export class IdempotencyKeyStore {
    constructor(
        private readonly prisma: PrismaService,
        private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
        private readonly jobLock: JobLock,
    ) {}

    /** A key released between our insert and our read (the first attempt failed) is claimed again. */
    async claim(request: ClaimRequest): Promise<ClaimResult> {
        const claimedId = await this.insert(request);
        if (claimedId) {
            return { outcome: 'CLAIMED', id: claimedId };
        }
        const existing = await this.prisma.idempotencyKey.findUnique({
            where: { userId_key: { userId: request.userId, key: request.key } },
            select: {
                id: true,
                endpoint: true,
                requestHash: true,
                statusCode: true,
                responseBody: true,
                expiresAt: true,
            },
        });
        if (!existing) {
            return this.claim(request);
        }
        if (existing.expiresAt.getTime() <= Date.now()) {
            await this.prisma.idempotencyKey.deleteMany({ where: { id: existing.id } });
            return this.claim(request);
        }
        if (existing.endpoint !== request.endpoint || existing.requestHash !== request.requestHash) {
            return { outcome: 'REUSED' };
        }
        if (existing.statusCode === null) {
            return { outcome: 'IN_PROGRESS' };
        }
        return {
            outcome: 'REPLAY',
            response: { statusCode: existing.statusCode, body: existing.responseBody },
        };
    }

    async complete(id: string, response: StoredResponse): Promise<void> {
        await this.prisma.idempotencyKey.update({
            where: { id },
            data: {
                statusCode: response.statusCode,
                responseBody: response.body === undefined ? Prisma.JsonNull : (response.body as Prisma.InputJsonValue),
            },
            select: { id: true },
        });
    }

    /** The request failed and nothing was done: the key can be used again. */
    async release(id: string): Promise<void> {
        await this.prisma.idempotencyKey.deleteMany({ where: { id } });
    }

    /**
     * DATA-23: a person's stored answers (they may hold their data) go with their account. Unlike a claim this joins
     * the caller's transaction, so it commits with the erasure.
     */
    async deleteForUser(userId: string): Promise<void> {
        await this.txHost.tx.idempotencyKey.deleteMany({ where: { userId } });
    }

    @Cron(CronExpression.EVERY_HOUR)
    async deleteExpired(): Promise<void> {
        await this.jobLock.runExclusive(JobName.DELETE_EXPIRED_IDEMPOTENCY_KEYS, async () => {
            await this.prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lte: new Date() } } });
        });
    }

    /** The new row's id, or undefined when the user already holds this key (the unique decided). */
    private async insert(request: ClaimRequest): Promise<string | undefined> {
        try {
            const { id } = await this.prisma.idempotencyKey.create({
                data: {
                    key: request.key,
                    userId: request.userId,
                    endpoint: request.endpoint,
                    requestHash: request.requestHash,
                    expiresAt: request.expiresAt,
                },
                select: { id: true },
            });
            return id;
        } catch (error) {
            if (classifyPrismaError(error) !== PrismaErrorKind.UNIQUE_VIOLATION) {
                throw error;
            }
            return undefined;
        }
    }
}
