import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from '@/common/persistence/prisma.service';

import type { AnonymisedUser, NewUser } from '../service/user.types';
import {
    type UserCredentialsRecord,
    userCredentialsSelect,
    type UserExportRecord,
    userExportSelect,
    type UserProfileRecord,
    userProfileSelect,
} from './record/user.record';

@Injectable()
export class UserRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    findCredentialsByEmail(email: string): Promise<UserCredentialsRecord | null> {
        return this.txHost.tx.user.findUnique({ where: { email }, select: userCredentialsSelect });
    }

    findCredentialsById(id: string): Promise<UserCredentialsRecord | null> {
        return this.txHost.tx.user.findUnique({ where: { id }, select: userCredentialsSelect });
    }

    findProfileById(id: string): Promise<UserProfileRecord | null> {
        return this.txHost.tx.user.findUnique({ where: { id }, select: userProfileSelect });
    }

    findExportById(id: string): Promise<UserExportRecord | null> {
        return this.txHost.tx.user.findUnique({ where: { id }, select: userExportSelect });
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await this.txHost.tx.user.count({ where: { email } });
        return count > 0;
    }

    /** Returns the new user's id. */
    async create(user: NewUser): Promise<string> {
        const { id } = await this.txHost.tx.user.create({
            data: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                passwordHash: user.passwordHash,
            },
            select: { id: true },
        });
        return id;
    }

    async updateName(id: string, name: { firstName: string; lastName: string }): Promise<void> {
        await this.txHost.tx.user.updateMany({
            where: { id },
            data: { ...name, updatedBy: id, version: { increment: 1 } },
        });
    }

    async updatePasswordHash(id: string, passwordHash: string, updatedBy: string): Promise<void> {
        await this.txHost.tx.user.updateMany({
            where: { id },
            data: { passwordHash, updatedBy, version: { increment: 1 } },
        });
    }

    /** Sets the verification instant once; a verified account is left as it is. Returns true when set. */
    async markEmailVerified(id: string, at: Date): Promise<boolean> {
        const { count } = await this.txHost.tx.user.updateMany({
            where: { id, emailVerifiedAt: null },
            data: { emailVerifiedAt: at, updatedBy: id, version: { increment: 1 } },
        });
        return count > 0;
    }

    /** DATA-23: the contacts are overwritten in place (the row stays: audit rows and messages reference it). */
    async anonymise(id: string, user: AnonymisedUser): Promise<void> {
        await this.txHost.tx.user.updateMany({
            where: { id },
            data: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: null,
                emailVerifiedAt: null,
                passwordHash: user.passwordHash,
                updatedBy: id,
                version: { increment: 1 },
            },
        });
    }
}
