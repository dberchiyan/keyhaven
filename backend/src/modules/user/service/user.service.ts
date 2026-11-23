import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { UserRepository } from '../repository/user.repository';
import type { NewUser, UserCredentials, UserExport, UserProfile } from './user.types';
import { USER_ROLES, type UserRole } from './user-role';

const ERASED_FIRST_NAME = 'Deleted';
const ERASED_LAST_NAME = 'account';

/** DATA-23: unique per account (uq_users_email) and on a reserved domain that can never receive mail (RFC 2606). */
const erasedEmailOf = (userId: string): string => `erased-${userId}@erased.keyhaven.invalid`;

const userRoleSchema = z.enum(USER_ROLES);

/** CORE-31: guarded by ck_users_role — parsing fails only when the schema and the code disagree. */
const toRole = (role: string): UserRole => userRoleSchema.parse(role);

/** Accounts: read by auth (sign-in, the principal) and by registration. No controller. */
@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
        const user = await this.userRepository.findCredentialsByEmail(email.toLowerCase());
        return user ? toCredentials(user) : null;
    }

    async findCredentialsById(id: string): Promise<UserCredentials | null> {
        const user = await this.userRepository.findCredentialsById(id);
        return user ? toCredentials(user) : null;
    }

    async findProfileById(id: string): Promise<UserProfile | null> {
        const user = await this.userRepository.findProfileById(id);
        return user ? { ...user, role: toRole(user.role) } : null;
    }

    /** DATA-23: the account's own fields for the person's export. */
    async findExportById(id: string): Promise<UserExport | null> {
        const user = await this.userRepository.findExportById(id);
        if (!user) {
            return null;
        }
        return {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: toRole(user.role),
            agencyName: user.agency?.name ?? null,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
        };
    }

    /**
     * DATA-23: name, email and phone replaced, the password hash with one nobody knows (computed before the
     * transaction, DATA-11). The id survives — history and conversations reference it.
     */
    anonymise(id: string, unusablePasswordHash: string): Promise<void> {
        return this.userRepository.anonymise(id, {
            firstName: ERASED_FIRST_NAME,
            lastName: ERASED_LAST_NAME,
            email: erasedEmailOf(id),
            passwordHash: unusablePasswordHash,
        });
    }

    existsByEmail(email: string): Promise<boolean> {
        return this.userRepository.existsByEmail(email.toLowerCase());
    }

    /** Returns the new user's id. Email is stored lower-case. */
    create(user: NewUser): Promise<string> {
        return this.userRepository.create({ ...user, email: user.email.toLowerCase() });
    }

    /** The person's own name (they are the one who changes it). */
    updateName(id: string, name: { firstName: string; lastName: string }): Promise<void> {
        return this.userRepository.updateName(id, name);
    }

    updatePasswordHash(id: string, passwordHash: string): Promise<void> {
        return this.userRepository.updatePasswordHash(id, passwordHash, id);
    }

    /** True when the address was not verified before. */
    markEmailVerified(id: string, at: Date): Promise<boolean> {
        return this.userRepository.markEmailVerified(id, at);
    }
}

const toCredentials = (user: {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    firstName: string;
    emailVerifiedAt: Date | null;
}): UserCredentials => ({
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: toRole(user.role),
    firstName: user.firstName,
    isEmailVerified: user.emailVerifiedAt !== null,
});
