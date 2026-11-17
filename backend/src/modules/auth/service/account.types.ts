import type { SignupRole } from '../../user/service/user-role';

export interface RegisterCommand {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: SignupRole;
    ip: string;
    userAgent: string | null;
    presentedToken: string | undefined;
}

export interface ResetPasswordCommand {
    token: string;
    newPassword: string;
    ip: string;
    userAgent: string | null;
    presentedToken: string | undefined;
}

export interface EmailVerification {
    email: string;
    verifiedAt: Date;
}
