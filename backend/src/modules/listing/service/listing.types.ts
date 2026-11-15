import type { Decimal, Money } from '../../../common/persistence/money';
import type { ListingKind } from './listing-kind';
import type { InsightPeriod } from './insight-period';
import type { ListingStatus } from './listing-status';
import type { PhotoContentType, PhotoStatus } from './photo-status';
import type { PropertyType } from './property-type';

export interface ListingCity {
  id: string;
  name: string;
  state: string;
  slug: string;
  timeZone: string;
}

/** What a search result card shows. */
export interface ListingCard {
  /** The viewer saved it (tenants); false for everyone else. */
  saved: boolean;
  id: string;
  title: string;
  propertyType: PropertyType;
  /** For rent (price = monthly rent) or for sale (price = asking price). */
  kind: ListingKind;
  price: Money;
  bedrooms: number;
  /** "1.5" — a decimal string, never a float. */
  bathrooms: string;
  sizeSqft: number;
  city: ListingCity;
  neighborhood: string | null;
  /** Move-in day of a home for rent; null for one for sale. */
  availableFrom: Date | null;
  publishedAt: Date | null;
  coverPhotoUrl: string | null;
  /** People who opened the page (one per person and day) — shown on every card. */
  viewCount: number;
}

/** A row of the owner's dashboard. */
export interface ManagedListingCard extends ListingCard {
  status: ListingStatus;
  /** A showcase row of the public demo: read-only (false outside DEMO_MODE). */
  demo: boolean;
  /** People who saved it. */
  saveCount: number;
}

/** Who to contact: the landlord, or the agency. */
export type ListedBy =
  | { kind: 'LANDLORD'; name: string; phone: string | null; email: string }
  | { kind: 'AGENCY'; name: string; phone: string; email: string; website: string | null };

/** The private part of the address, shown only to those allowed (see the Listing model). */
export interface ListingAddress {
  line1: string;
  line2: string | null;
}

/** How many comparable homes the median rests on before it is shown at all. */
export const PRICE_CONTEXT_MIN_SAMPLE = 3;

/**
 * The price against comparable homes (same kind, city and type): the neighborhood's median when
 * enough homes are there, else the city's; null when even the city has too few.
 */
export interface PriceContext {
  scope: 'NEIGHBORHOOD' | 'CITY';
  median: Money;
  /** Homes the median is based on. */
  sample: number;
  /** This home against the median, in whole percent: −8 is 8 % below. */
  differencePercent: number;
}

export interface ListingDetail extends ListingCard {
  /** A showcase row of the public demo: read-only (false outside DEMO_MODE). */
  demo: boolean;
  priceContext: PriceContext | null;
  description: string;
  furnished: boolean;
  petsAllowed: boolean;
  parking: boolean;
  zip: string;
  photos: { id: string; url: string }[];
  listedBy: ListedBy;
  /** Null when hidden from the caller. */
  address: ListingAddress | null;
}

/** A photo of a listing as its owner sees it: uploads that were never finished show as pending. */
export interface ManagedPhoto {
  id: string;
  url: string | null;
  status: PhotoStatus;
  position: number | null;
}

/** A listing as its owner (or an admin) manages it. */
export interface ManagedListing extends ListingDetail {
  status: ListingStatus;
  address: ListingAddress;
  cityId: string;
  saveCount: number;
  managedPhotos: ManagedPhoto[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/** What the owner writes (create and edit); ownership and status never come from the client. */
export interface ListingDraft {
  title: string;
  description: string;
  propertyType: PropertyType;
  kind: ListingKind;
  price: Decimal;
  bedrooms: number;
  bathrooms: Decimal;
  sizeSqft: number;
  addressLine1: string;
  addressLine2: string | null;
  cityId: string;
  neighborhood: string | null;
  zip: string;
  petsAllowed: boolean;
  furnished: boolean;
  parking: boolean;
  /** Required for a home for rent, absent for one for sale (ck_listings_available_from). */
  availableFrom: Date | null;
}

/** Who opened a listing page: a signed-in person or a visitor known by a daily hash. */
export type ListingViewer =
  { kind: 'USER'; userId: string } | { kind: 'VISITOR'; visitorKey: string };

export interface UpdateListingCommand extends ListingDraft {
  version: number;
}

/** An upload intent: where the client PUTs the photo, and the row that waits for it. */
export interface PhotoUploadIntent {
  photoId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface NewPhotoIntent {
  filename: string;
  contentType: PhotoContentType;
  sizeBytes: number;
}

/** Whose listings a dashboard shows — derived from the principal, never from the request. */
export type ListingScope =
  { kind: 'LANDLORD'; landlordId: string } | { kind: 'AGENCY'; agencyId: string } | { kind: 'ALL' };

/** Views and saves of one UTC day. */
export interface InsightPoint {
  /** `YYYY-MM-DD`. */
  day: string;
  views: number;
  saves: number;
}

export interface InsightTotals {
  views: number;
  saves: number;
}

/** How a listing (or the caller's whole scope) did over the last `period` days. */
export interface ListingInsights {
  /** The first and the last day of the window, `YYYY-MM-DD` (UTC days, data.md). */
  from: string;
  to: string;
  period: InsightPeriod;
  /** One point per day of the window, oldest first; quiet days are zero, never missing. */
  series: InsightPoint[];
  totals: InsightTotals;
  /** The same window one period earlier — the "against last period" comparison. */
  previous: InsightTotals;
}

export interface InsightTopListing {
  listing: ManagedListingCard;
  /** Within the window, unlike the card's lifetime counts. */
  views: number;
  saves: number;
}

/** The dashboard's insights: the scope's series plus the listings that drew the most interest. */
export interface ManagedInsights extends ListingInsights {
  top: InsightTopListing[];
}

/** Whose activity the insights count: the dashboard's scope, or one listing. */
export type InsightTarget = ListingScope | { kind: 'LISTING'; listingId: string };
