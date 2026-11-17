import { apiClient } from '@/shared/api/client';
import type {
    CurrentUser,
    EmailVerification,
    LoginRequest,
    PasswordResetRequestRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
} from '../types';

const BASE = '/api/v1/auth';
const REGISTRATIONS = '/api/v1/registrations';

export const authApi = {
    login: async (request: LoginRequest): Promise<CurrentUser> =>
        (await apiClient.post<CurrentUser>(`${BASE}/login`, request)).data,
    logout: async (): Promise<void> => {
        await apiClient.post(`${BASE}/logout`);
    },
    me: async (): Promise<CurrentUser> => (await apiClient.get<CurrentUser>(`${BASE}/me`)).data,
    /** A new account, signed in at once (session cookies in the answer); the verification email follows. */
    register: async (request: RegisterRequest): Promise<CurrentUser> =>
        (await apiClient.post<CurrentUser>(REGISTRATIONS, request)).data,
    /** The token from the verification email (works signed out). */
    verifyEmail: async (request: VerifyEmailRequest): Promise<EmailVerification> =>
        (await apiClient.post<EmailVerification>(`${BASE}/email-verifications`, request)).data,
    /** A fresh verification email for the signed-in user. */
    resendVerification: async (): Promise<void> => {
        await apiClient.post(`${BASE}/email-verification-requests`);
    },
    /** Answers the same whether the address has an account or not. */
    requestPasswordReset: async (request: PasswordResetRequestRequest): Promise<void> => {
        await apiClient.post(`${BASE}/password-reset-requests`, request);
    },
    /** The token from the reset email and the new password; the answer signs the browser in. */
    resetPassword: async (request: ResetPasswordRequest): Promise<CurrentUser> =>
        (await apiClient.post<CurrentUser>(`${BASE}/password-resets`, request)).data,
};

/** A 401 from these never means "the session was lost": they run without one. */
export const AUTH_SESSION_ENDPOINTS: readonly string[] = [
    `${BASE}/me`,
    `${BASE}/login`,
    REGISTRATIONS,
    `${BASE}/email-verifications`,
    `${BASE}/password-reset-requests`,
    `${BASE}/password-resets`,
];
