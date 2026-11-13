import { lazyWithPreload } from '@/shared/lib/lazyWithPreload';

/** Public surface of the auth feature. Pages are lazy so the router stays in the shell chunk. */
export const LoginPage = lazyWithPreload(() => import('./pages/LoginPage'));
export const SignupPage = lazyWithPreload(() => import('./pages/SignupPage'));
export const VerifyEmailPage = lazyWithPreload(() => import('./pages/VerifyEmailPage'));
export const ForgotPasswordPage = lazyWithPreload(() => import('./pages/ForgotPasswordPage'));
export const ResetPasswordPage = lazyWithPreload(() => import('./pages/ResetPasswordPage'));
export { RequireAuth } from './components/RequireAuth';
export { RequireAccess } from './components/RequireAccess';
export { IdleSessionWarning } from './components/IdleSessionWarning';
export { VerificationBanner } from './components/VerificationBanner';
export { useAccess } from './hooks/useAccess';
export { ACCESS, type AccessPart, type UserRole } from './access';
export { useLogout } from './hooks/useLogout';
export { useCurrentUser } from './hooks/useCurrentUser';
export { authKeys } from './hooks/queryKeys';
export { useResendVerification } from './hooks/useAccountRecovery';
export {
  useChangePassword,
  useEndOtherSessions,
  useEndSession,
  useOwnSecurityLog,
  useSessions,
  useUpdateOwnName,
} from './hooks/useAccount';
export { SecurityLogView } from './components/SecurityLogView';
export { isSecurityCategory } from './securityLog';
export { describeUserAgent } from './userAgent';
export { AUTH_SESSION_ENDPOINTS } from './api/authApi';
export type {
  ChangePasswordRequest,
  CurrentUser,
  SecurityCategory,
  SecurityEvent,
  SecurityLog,
  UpdateOwnNameRequest,
  UserSession,
  UserSessions,
} from './types';
export { SECURITY_LOG_PAGE_SIZE, SESSIONS_PAGE_SIZE } from './api/accountApi';
export type { LoginLocationState } from './hooks/useLoginRedirect';
