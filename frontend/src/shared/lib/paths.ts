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
  /** A tenant's saved homes and searches. */
  saved: '/saved',
  /** A tenant's viewings, or the owner's viewings dashboard. */
  viewings: '/viewings',
  /** The inbox, and one conversation (a viewing's thread, or a request to Keyhaven). */
  messages: '/messages',
  conversation: '/messages/:conversationId',
  newListing: '/manage/new',
  managedListing: '/manage/:listingId',
  editListing: '/manage/:listingId/edit',
  settings: '/settings',
  settingsSection: '/settings/:section',
} as const;

/** `/listings/:listingId` — one published home. */
export const listingPath = (listingId: string): string =>
  PATHS.listing.replace(':listingId', encodeURIComponent(listingId));

/** `/manage/:listingId` — one listing in the owner's dashboard. */
export const managedListingPath = (listingId: string): string =>
  PATHS.managedListing.replace(':listingId', encodeURIComponent(listingId));

/** `/manage/:listingId/edit` — the listing's details form. */
export const editListingPath = (listingId: string): string =>
  PATHS.editListing.replace(':listingId', encodeURIComponent(listingId));

/** `/settings/<section>` — one section of Settings. */
export const settingsPath = (section: string): string =>
  PATHS.settingsSection.replace(':section', encodeURIComponent(section));

/** `/messages/:conversationId` — one conversation (a viewing's thread has the viewing's id). */
export const conversationPath = (conversationId: string): string =>
  PATHS.conversation.replace(':conversationId', encodeURIComponent(conversationId));
