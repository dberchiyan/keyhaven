import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repository/user.repository';
import { isUserRole, type UserRole } from './user-role';
import type { NewUser, UserCredentials, UserProfile } from './user.types';

const toRole = (role: string): UserRole => {
    if (!isUserRole(role)) {
        // Guarded by ck_users_role; reaching this means the schema and code disagree.
        throw new Error('Unknown user role in database');
    }
    return role;
};

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
