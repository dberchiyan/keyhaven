export const UserRole = {
    TENANT: 'TENANT',
    LANDLORD: 'LANDLORD',
    AGENT: 'AGENT',
    ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES = Object.values(UserRole) as [UserRole, ...UserRole[]];

export const isUserRole = (value: string): value is UserRole => (USER_ROLES as readonly string[]).includes(value);

export const SIGNUP_ROLES = [UserRole.TENANT, UserRole.LANDLORD] as const satisfies readonly UserRole[];
export type SignupRole = (typeof SIGNUP_ROLES)[number];

/** What a session of this role may do. Roles map to themselves: no role contains another. */
export const authoritiesFor = (role: UserRole): string[] => [role];
