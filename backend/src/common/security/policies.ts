import { DemoReadOnlyException, ResourceNotFoundException } from '../exception/api.exception';
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

/**
 * Writes to a showcase listing of the public demo answer 403 DEMO_READ_ONLY, once the caller's
 * authority and ownership passed (a foreign id stays a plain 403, an unknown one a 404).
 */
const orReadOnly = (demo: boolean): true => {
  if (demo) {
    throw new DemoReadOnlyException();
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
      isLister(principal) &&
      (await permissions.isOwnListing(principal, args.listingId ?? '')) &&
      orReadOnly(await permissions.isDemoListing(args.listingId ?? '')),
    'verified',
  ),
  /** Taking a listing off the site: admins only; an unknown id is 404. */
  suspendListing: policy(['listingId'], async (principal, args, permissions) => {
    if (!isAdmin(principal)) {
      return false;
    }
    orNotFound(await permissions.listingExists(args.listingId ?? ''));
    return orReadOnly(await permissions.isDemoListing(args.listingId ?? ''));
  }),
  /** Creating a listing: landlords and agents, once their email is verified. */
  createListing: policy([], isLister, 'verified'),
  /** Editing details and photos: the owner (landlord / agency agent), verified — someone else's is 403. */
  editListing: policy(
    ['listingId'],
    async (principal, args, permissions) =>
      isLister(principal) &&
      (await permissions.isOwnListing(principal, args.listingId ?? '')) &&
      orReadOnly(await permissions.isDemoListing(args.listingId ?? '')),
    'verified',
  ),
  /** One photo of one of the owner's listings: the whole chain (photo → listing → owner). */
  managePhoto: policy(
    ['listingId', 'photoId'],
    async (principal, args, permissions) =>
      isLister(principal) &&
      (await permissions.isOwnListingPhoto(principal, args.listingId ?? '', args.photoId ?? '')) &&
      orReadOnly(await permissions.isDemoListing(args.listingId ?? '')),
    'verified',
  ),
  /** A home's open viewing slots: everyone who may see the home (published, or 404), visitors too. */
  viewListingSlots: publicPolicy(['listingId'], async (principal, args, permissions) =>
    orNotFound(
      principal
        ? await permissions.isVisibleListing(principal, args.listingId ?? '')
        : await permissions.isPublishedListing(args.listingId ?? ''),
    ),
  ),
  /** Asking for a viewing: a tenant with a verified email; the service checks the home is published. */
  requestViewing: policy([], isTenant, 'verified'),
  /** A tenant's own viewings. */
  viewOwnViewings: policy([], isTenant),
  /**
   * One viewing: its tenant, the home's owner (landlord / agency agent) — someone else's is 403 —
   * or an admin (404 when unknown).
   */
  viewViewing: policy(['viewingId'], async (principal, args, permissions) =>
    isAdmin(principal)
      ? orNotFound(await permissions.viewingExists(args.viewingId ?? ''))
      : isTenant(principal)
        ? await permissions.isOwnViewing(principal.userId, args.viewingId ?? '')
        : isLister(principal) &&
          (await permissions.isOwnListingViewing(principal, args.viewingId ?? '')),
  ),
  /** Confirming or declining a request: the home's owner (landlord / agency agent) only. */
  decideViewing: policy(
    ['viewingId'],
    async (principal, args, permissions) =>
      isLister(principal) &&
      (await permissions.isOwnListingViewing(principal, args.viewingId ?? '')),
  ),
  /** Cancelling: the tenant their own viewing, the owner one of their home's. */
  cancelViewing: policy(['viewingId'], async (principal, args, permissions) =>
    isTenant(principal)
      ? await permissions.isOwnViewing(principal.userId, args.viewingId ?? '')
      : isLister(principal) &&
        (await permissions.isOwnListingViewing(principal, args.viewingId ?? '')),
  ),
  /** The viewings dashboard: landlords (their homes'), agents (the agency's), admins (all). */
  manageViewings: policy([], (principal) => isAdmin(principal) || isLister(principal)),
  /** The live event stream: anyone signed in gets their own events (the service scopes them). */
  subscribeEvents: policy([], () => true),
  /** The inbox: anyone signed in — tenants their viewings' conversations, listers their homes', admins all (read only). */
  viewConversations: policy([], () => true),
  /**
   * Writing in a viewing's conversation, or marking it read: the viewing's tenant or the home's
   * owner (landlord / agency agent) — someone else's is 403, admins read only. Whether the viewing
   * is confirmed is the service's rule (422).
   */
  messageViewing: policy(['viewingId'], async (principal, args, permissions) =>
    isTenant(principal)
      ? await permissions.isOwnViewing(principal.userId, args.viewingId ?? '')
      : isLister(principal) &&
        (await permissions.isOwnListingViewing(principal, args.viewingId ?? '')),
  ),
  /** Saved homes are a tenant's thing. */
  viewSavedListings: policy([], isTenant),
  /** The homes one opened lately: anyone signed in, their own rows only. */
  viewRecentListings: policy([], () => true),
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
