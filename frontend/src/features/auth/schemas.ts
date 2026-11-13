import { z } from 'zod';
import { newPasswordSchema, PASSWORD_LIMITS } from '@/shared/lib/passwordRules';

/** Mirrors backend LoginRequestSchema (auth/controller/dto/login.request.ts). */
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MAX_LENGTH = 128;
export const LOGIN_FIELD_LIMITS = {
  email: EMAIL_MAX_LENGTH,
  password: PASSWORD_MAX_LENGTH,
} as const;

const MESSAGES = {
  emailRequired: 'validation:email.required',
  emailInvalid: 'validation:email.invalid',
  emailTooLong: 'validation:email.tooLong',
  passwordRequired: 'validation:password.required',
  passwordTooLong: 'validation:password.tooLong',
} as const;

export type LoginValidationMessage = (typeof MESSAGES)[keyof typeof MESSAGES];

const MESSAGE_SET: ReadonlySet<string> = new Set(Object.values(MESSAGES));

export const isLoginValidationMessage = (message: string): message is LoginValidationMessage =>
  MESSAGE_SET.has(message);

const emailSchema = z
  .string()
  .trim()
  .min(1, MESSAGES.emailRequired)
  .max(EMAIL_MAX_LENGTH, MESSAGES.emailTooLong)
  .pipe(z.email(MESSAGES.emailInvalid));

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, MESSAGES.passwordRequired)
    .max(PASSWORD_MAX_LENGTH, MESSAGES.passwordTooLong),
});

export type LoginFormValues = z.input<typeof loginSchema>;
export type LoginFormOutput = z.output<typeof loginSchema>;

/** Mirrors backend RegisterRequestSchema (auth/controller/dto/register.request.ts). */
export const SIGNUP_LIMITS = {
  firstName: 100,
  lastName: 100,
  email: EMAIL_MAX_LENGTH,
  password: PASSWORD_LIMITS.max,
} as const;

export const SIGNUP_ROLES = ['TENANT', 'LANDLORD'] as const;

export const signupSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'validation:firstName.required')
    .max(SIGNUP_LIMITS.firstName, 'validation:firstName.tooLong'),
  lastName: z
    .string()
    .trim()
    .min(1, 'validation:lastName.required')
    .max(SIGNUP_LIMITS.lastName, 'validation:lastName.tooLong'),
  email: emailSchema,
  password: newPasswordSchema,
  role: z.enum(SIGNUP_ROLES, { error: 'validation:role.invalid' }),
});

export type SignupValues = z.input<typeof signupSchema>;
export type SignupOutput = z.output<typeof signupSchema>;

/** Mirrors backend PasswordResetRequestRequestSchema (auth/controller/dto/password-reset-request.request.ts). */
export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.input<typeof forgotPasswordSchema>;
export type ForgotPasswordOutput = z.output<typeof forgotPasswordSchema>;

/** Mirrors backend ResetPasswordRequestSchema (auth/controller/dto/reset-password.request.ts); the repeat is client-side. */
export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'validation:confirmPassword.required'),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    message: 'validation:confirmPassword.mismatch',
  });
export type ResetPasswordValues = z.input<typeof resetPasswordSchema>;
export type ResetPasswordOutput = z.output<typeof resetPasswordSchema>;
