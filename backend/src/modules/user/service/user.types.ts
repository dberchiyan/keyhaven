import type { UserRole } from './user-role';

export interface UserCredentials {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    firstName: string;
    isEmailVerified: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: UserRole;
    emailVerifiedAt: Date | null;
    /** The agent's agency; null for every other role. */
    agency: { id: string; name: string } | null;
}

export interface NewUser {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    /** Argon2 hash, computed before the transaction opens. */
    passwordHash: string;
}
