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
    agency: { id: string; name: string } | null;
}

export interface NewUser {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    passwordHash: string;
}

export interface UserExport {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: UserRole;
    agencyName: string | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
}

export interface AnonymisedUser {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
}
