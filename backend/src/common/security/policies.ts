import { ResourceNotFoundException } from '../exception/api.exception';
import { policy, publicPolicy } from './policy';
import type { Principal } from './principal';

/**
 * An unknown id — or one the caller may not know about — answers 404, once the authority passed
 * (no authority → 403). Used by admin-style policies (security.md → Authorisation).
 */
const orNotFound = (exists: boolean): true => {
  if (!exists) {
    throw new ResourceNotFoundException();
  }
  return true;
};

const isAdmin = (principal: Principal): boolean => principal.hasAuthority('ADMIN');
const isTenant = (principal: Principal): boolean => principal.hasAuthority('TENANT');
/** Landlords and agents list homes; the agent's agency owns theirs. */
const isLister = (principal: Principal): boolean =>
  principal.hasAuthority('LANDLORD') || principal.hasAuthority('AGENT');

/** Declared constants, never built inline. The product's access matrix. */
export const can = {
  /** The caller's own account (sign-out, password, sessions, verification email) — any state. */
  ownAccount: policy([], () => true, 'account'),
  /** One's own sessions only (Settings → Sessions). */
  endOwnSession: policy(
    ['sessionId'],
    (principal, args, permissions) =>
      permissions.isOwnSession(principal.userId, args.sessionId ?? ''),
    'account',
  ),
  /** Keyhaven staff: `/metrics` and anything else that is not tied to a listing. */
  admin: policy([], isAdmin),
  /** Everyone, signed in or not: published homes and the cities (the public catalogue). */
  browseListings: publicPolicy([], () => true),
  /**
   * One listing: published ones are open to everyone, visitors included; a draft, unpublished or
   * suspended one only to its owner (landlord / the agency's agents) and admins — anyone else
   * gets 404, exactly like an unknown id.
   */
  viewListing: publicPolicy(['listingId'], async (principal, args, permissions) =>
    orNotFound(
      principal
        ? await permissions.isVisibleListing(principal, args.listingId ?? '')
        : await permissions.isPublishedListing(args.listingId ?? ''),
    ),
  ),
  /** The listings dashboard: landlords (their own), agents (the agency's), admins (all). */
  manageListings: policy([], (principal) => isAdmin(principal) || isLister(principal)),
  /**
   * One listing in the dashboard: an admin for any listing (404 when unknown), a landlord for
   * their own, an agent for their agency's — someone else's answers 403 (ownership policy).
   */
  manageListing: policy(['listingId'], async (principal, args, permissions) =>
    isAdmin(principal)
      ? orNotFound(await permissions.listingExists(args.listingId ?? ''))
      : isLister(principal) && (await permissions.isOwnListing(principal, args.listingId ?? '')),
  ),
  /**
   * Publishing and unpublishing: the owner (landlord / agency agent) only, with a verified email —
   * admins take listings down through suspension instead.
   */
  publishListing: policy(
    ['listingId'],
    async (principal, args, permissions) =>
      isLister(principal) && (await permissions.isOwnListing(principal, args.listingId ?? '')),
    'verified',
  ),
  /** Taking a listing off the site: admins only; an unknown id is 404. */
  suspendListing: policy(
    ['listingId'],
    async (principal, args, permissions) =>
      isAdmin(principal) && orNotFound(await permissions.listingExists(args.listingId ?? '')),
  ),
  /** Creating a listing: landlords and agents, once their email is verified. */
  createListing: policy([], isLister, 'verified'),
  /** Editing details and photos: the owner (landlord / agency agent), verified — someone else's is 403. */
  editListing: policy(
    ['listingId'],
    async (principal, args, permissions) =>
      isLister(principal) && (await permissions.isOwnListing(principal, args.listingId ?? '')),
    'verified',
  ),
  /** One photo of one of the owner's listings: the whole chain (photo → listing → owner). */
  managePhoto: policy(
    ['listingId', 'photoId'],
    async (principal, args, permissions) =>
      isLister(principal) &&
      (await permissions.isOwnListingPhoto(principal, args.listingId ?? '', args.photoId ?? '')),
    'verified',
  ),
  /** Saved homes are a tenant's thing. */
  viewSavedListings: policy([], isTenant),
  /** Saving: a tenant, and the listing is on the site (otherwise 404, like an unknown id). */
  saveListing: policy(
    ['listingId'],
    async (principal, args, permissions) =>
      isTenant(principal) && orNotFound(await permissions.isPublishedListing(args.listingId ?? '')),
  ),
  /** Unsaving needs no existing listing: a gone listing's save may go too. */
  unsaveListing: policy(['listingId'], isTenant),
  /** Saved searches are a tenant's thing. */
  manageSavedSearches: policy([], isTenant),
  /** One saved search: the caller's own (someone else's is 403). */
  manageSavedSearch: policy(
    ['savedSearchId'],
    async (principal, args, permissions) =>
      isTenant(principal) &&
      (await permissions.isOwnSavedSearch(principal.userId, args.savedSearchId ?? '')),
  ),
} as const;
