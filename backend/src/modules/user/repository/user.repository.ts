import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../../common/persistence/prisma.service';
import type { NewUser } from '../service/user.types';
import {
  type UserCredentialsRecord,
  type UserProfileRecord,
  userCredentialsSelect,
  userProfileSelect,
} from './record/user.record';

@Injectable()
export class UserRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  findCredentialsByEmail(email: string): Promise<UserCredentialsRecord | null> {
    return this.txHost.tx.user.findUnique({ where: { email }, select: userCredentialsSelect });
  }

  findCredentialsById(id: string): Promise<UserCredentialsRecord | null> {
    return this.txHost.tx.user.findUnique({ where: { id }, select: userCredentialsSelect });
  }

  findProfileById(id: string): Promise<UserProfileRecord | null> {
    return this.txHost.tx.user.findUnique({ where: { id }, select: userProfileSelect });
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.txHost.tx.user.count({ where: { email } }).then((count) => count > 0);
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
}
