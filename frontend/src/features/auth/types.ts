import type { Operations, Schemas } from '@/shared/types';

export type CurrentUser = Schemas['CurrentUserResponse_Output'];
export type LoginRequest = Schemas['LoginRequest'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type SignupRole = RegisterRequest['role'];
export type VerifyEmailRequest = Schemas['VerifyEmailRequest'];
export type EmailVerification = Schemas['EmailVerificationResponse_Output'];
export type PasswordResetRequestRequest = Schemas['PasswordResetRequestRequest'];
export type ResetPasswordRequest = Schemas['ResetPasswordRequest'];
export type ChangePasswordRequest = Schemas['ChangePasswordRequest'];
export type UpdateOwnNameRequest = Schemas['UpdateOwnNameRequest'];
export type UserSession = Schemas['Session_Output'];
/** This session and a page of the other live ones. */
export type UserSessions = Schemas['SessionsResponse_Output'];
export type SecurityEvent = Schemas['SecurityEvent_Output'];
export type SecurityLog = Schemas['SecurityLogResponse_Output'];
/** `?category=` of the security log: which kind of events to list. */
export type SecurityCategory = NonNullable<
    NonNullable<Operations['AuthController_securityLog']['parameters']['query']>['category']
>;
