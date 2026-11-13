export const UserRole = {
  /** Looks for a home: searches, saves listings and searches, books viewings. */
  TENANT: 'TENANT',
  /** Lists and manages their own homes. */
  LANDLORD: 'LANDLORD',
  /** Belongs to an agency and manages the agency's listings. */
  AGENT: 'AGENT',
  /** Keyhaven staff: sees everything and can take a listing off the site. */
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES = Object.values(UserRole) as [UserRole, ...UserRole[]];

export const isUserRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value);

/** Roles a person can choose at sign-up; agents and admins are created by the seed / an admin. */
export const SIGNUP_ROLES = [
  UserRole.TENANT,
  UserRole.LANDLORD,
] as const satisfies readonly UserRole[];
export type SignupRole = (typeof SIGNUP_ROLES)[number];

/** What a session of this role may do. Roles map to themselves: no role contains another. */
export const authoritiesFor = (role: UserRole): string[] => [role];
