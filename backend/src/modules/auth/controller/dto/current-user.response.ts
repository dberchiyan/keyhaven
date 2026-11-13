import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { USER_ROLES } from '../../../user/service/user-role';

export const UserRoleSchema = z.enum(USER_ROLES).meta({ id: 'UserRole' });

export const CurrentUserResponseSchema = z.object({
  id: z.uuid(),
  email: z.string().max(254),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  phone: z.string().max(32).nullable(),
  role: UserRoleSchema,
  /** Null until the person opened the verification link (or reset the password by email). */
  emailVerifiedAt: z.iso.datetime().nullable(),
  /** The agent's agency; null for every other role. */
  agency: z.object({ id: z.uuid(), name: z.string().max(120) }).nullable(),
  /** Minutes without activity after which the session ends (the client warns before). */
  idleTimeoutMinutes: z.number().int().min(1),
  /**
   * One of the public demo's shared showcase accounts: actions that would lock other visitors
   * out are turned off for it. False for everyone else (an account a visitor created included).
   */
  demoRestricted: z.boolean(),
  /**
   * The public demo is on: showcase listings are read-only and everything added is wiped at the
   * daily reset. False locally.
   */
  demoMode: z.boolean(),
});

export class CurrentUserResponse extends createZodDto(CurrentUserResponseSchema) {}
