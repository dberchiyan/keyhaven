import type { CurrentUser } from '../types';
import { useCurrentUser } from './use-auth-queries';

export type UserRole = CurrentUser['role'];

const EVERYONE = ['TENANT', 'LANDLORD', 'AGENT', 'ADMIN'] as const satisfies readonly UserRole[];
const LISTERS = ['LANDLORD', 'AGENT', 'ADMIN'] as const satisfies readonly UserRole[];
const OWNERS = ['LANDLORD', 'AGENT'] as const satisfies readonly UserRole[];
const ADMINS = ['ADMIN'] as const satisfies readonly UserRole[];
const TENANTS = ['TENANT'] as const satisfies readonly UserRole[];

export const ACCESS = {
    'section.browse': EVERYONE,
    'section.listings': LISTERS,
    'section.settings': EVERYONE,
    'home.manage': LISTERS,
    'section.viewings': EVERYONE,
    'section.messages': EVERYONE,
    'message.start': ['TENANT', 'LANDLORD', 'AGENT'],
    'message.manage': ADMINS,
    'viewing.book': TENANTS,
    'viewing.manage': LISTERS,
    'viewing.decide': OWNERS,
    'viewing.hours': OWNERS,
    'section.saved': TENANTS,
    'listing.save': TENANTS,
    'listing.create': OWNERS,
    'listing.edit': OWNERS,
    'listing.publish': OWNERS,
    'listing.suspend': ADMINS,
    'account.changePassword': EVERYONE,
    'account.endSessions': EVERYONE,
    'account.erase': ['TENANT', 'LANDLORD', 'AGENT'],
    'account.eraseUnpublishes': ['LANDLORD'],
} as const satisfies Record<string, readonly UserRole[]>;

export type AccessPart = keyof typeof ACCESS;

const DEMO_RESTRICTED: ReadonlySet<AccessPart> = new Set<AccessPart>(['account.changePassword', 'account.endSessions']);

/**
 * The one place the UI decides by role (ARCH-37); hiding is cosmetic — the API enforces every rule
 * (FSEC-8). Password change and ending sessions are closed to the demo's shared showcase accounts
 * (`isDemoRestricted`): one visitor using them would lock the others out.
 */
const allows = (role: UserRole | undefined, part: AccessPart, isDemoRestricted = false): boolean =>
    role !== undefined &&
    ACCESS[part].some((allowed: UserRole) => allowed === role) &&
    !(isDemoRestricted && DEMO_RESTRICTED.has(part));

export interface Access {
    canAccess: (part: AccessPart) => boolean;
}

/** `canAccess(part)` for the signed-in user, so components never compare `user.role` themselves (ARCH-37). */
export const useAccess = (): Access => {
    const user = useCurrentUser().data;
    const role = user?.role;
    const isDemoRestricted = user?.isDemoRestricted ?? false;
    return { canAccess: (part: AccessPart) => allows(role, part, isDemoRestricted) };
};
