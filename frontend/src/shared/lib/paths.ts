/** Route paths — one module for the router and every link. */
export const PATHS = {
  login: '/login',
  signup: '/signup',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  /** Home: the listings dashboard for landlords, agents and admins; tenants go to Browse. */
  home: '/',
  browse: '/browse',
  listing: '/listings/:listingId',
  managedListing: '/manage/:listingId',
  settings: '/settings',
  settingsSection: '/settings/:section',
} as const;

/** `/listings/:listingId` — one published home. */
export const listingPath = (listingId: string): string =>
  PATHS.listing.replace(':listingId', encodeURIComponent(listingId));

/** `/manage/:listingId` — one listing in the owner's dashboard. */
export const managedListingPath = (listingId: string): string =>
  PATHS.managedListing.replace(':listingId', encodeURIComponent(listingId));

/** `/settings/<section>` — one section of Settings. */
export const settingsPath = (section: string): string =>
  PATHS.settingsSection.replace(':section', encodeURIComponent(section));
