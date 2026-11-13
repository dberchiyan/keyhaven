import type { CurrentUser } from './types';

export type UserRole = CurrentUser['role'];

/** Every signed-in role. */
const EVERYONE = ['TENANT', 'LANDLORD', 'AGENT', 'ADMIN'] as const satisfies readonly UserRole[];
/** People who manage listings: their own (landlords), the agency's (agents), all (admins). */
const LISTERS = ['LANDLORD', 'AGENT', 'ADMIN'] as const satisfies readonly UserRole[];
/** Owners of listings — admins take listings down through suspension instead. */
const OWNERS = ['LANDLORD', 'AGENT'] as const satisfies readonly UserRole[];
const ADMINS = ['ADMIN'] as const satisfies readonly UserRole[];

/**
 * Which roles use which parts of the interface — the one place the UI decides by role. Hiding is
 * cosmetic: the API enforces every rule on its own. Add a part here and read it with
 * `useAccess()` / `<RequireAccess>`; never compare `user.role` in a component.
 */
export const ACCESS = {
  /** Menu sections (and their routes). */
  'section.browse': EVERYONE,
  'section.listings': LISTERS,
  'section.settings': EVERYONE,
  /** Home (`/`): the listings dashboard; everyone else lands on Browse. */
  'home.manage': LISTERS,
  /** One listing in the dashboard: publish and unpublish (owners), suspend (admins). */
  'listing.publish': OWNERS,
  'listing.suspend': ADMINS,
  /** Settings → Account / Sessions: one's own password and other sessions. */
  'account.changePassword': EVERYONE,
  'account.endSessions': EVERYONE,
} as const satisfies Record<string, readonly UserRole[]>;

export type AccessPart = keyof typeof ACCESS;

/**
 * Turned off for the demo's shared showcase accounts (`demoRestricted` from the server, which
 * refuses them too): each would lock other visitors out. An account a visitor created keeps them.
 */
const DEMO_RESTRICTED: ReadonlySet<AccessPart> = new Set<AccessPart>([
  'account.changePassword',
  'account.endSessions',
]);

/** Does this role use that part (and is it open to a demo showcase account)? No user → no. */
export const canAccess = (
  role: UserRole | undefined,
  part: AccessPart,
  demoRestricted = false,
): boolean =>
  role !== undefined &&
  (ACCESS[part] as readonly UserRole[]).includes(role) &&
  !(demoRestricted && DEMO_RESTRICTED.has(part));
