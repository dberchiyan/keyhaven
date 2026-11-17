import { lazyWithPreload } from '@/shared/lib/lazy-with-preload';

export const LoginPage = lazyWithPreload(async () => ({ default: (await import('./pages/login-page')).LoginPage }));
export const SignupPage = lazyWithPreload(async () => ({ default: (await import('./pages/signup-page')).SignupPage }));
export const VerifyEmailPage = lazyWithPreload(async () => ({
    default: (await import('./pages/verify-email-page')).VerifyEmailPage,
}));
export const ForgotPasswordPage = lazyWithPreload(async () => ({
    default: (await import('./pages/forgot-password-page')).ForgotPasswordPage,
}));
export const ResetPasswordPage = lazyWithPreload(async () => ({
    default: (await import('./pages/reset-password-page')).ResetPasswordPage,
}));
export { SECURITY_LOG_PAGE_SIZE, SESSIONS_PAGE_SIZE } from './api/account-api';
export { AUTH_SESSION_ENDPOINTS } from './api/auth-api';
export { IdleSessionWarning } from './components/idle-session-warning';
export { RequireAccess } from './components/require-access';
export { RequireAuth } from './components/require-auth';
export { SecurityLogView } from './components/security-log-view';
export { VerificationBanner } from './components/verification-banner';
export { describeUserAgent, isSecurityCategory } from './format';
export { authKeys } from './hooks/query-keys';
export { ACCESS, type AccessPart, useAccess, type UserRole } from './hooks/use-access';
export {
    useChangePassword,
    useEndOtherSessions,
    useEndSession,
    useOwnSecurityLog,
    useSessions,
    useUpdateOwnName,
} from './hooks/use-account';
export { useResendVerification } from './hooks/use-account-recovery';
export { useCurrentUser } from './hooks/use-current-user';
export type { LoginLocationState } from './hooks/use-login-redirect';
export { useLogout } from './hooks/use-logout';
export { useDownloadPersonalData, useEraseAccount } from './hooks/use-personal-data-queries';
export type {
    ChangePasswordRequest,
    CurrentUser,
    EraseAccountRequest,
    PersonalDataExport,
    SecurityCategory,
    SecurityEvent,
    SecurityLog,
    UpdateOwnNameRequest,
    UserSession,
    UserSessions,
} from './types';
