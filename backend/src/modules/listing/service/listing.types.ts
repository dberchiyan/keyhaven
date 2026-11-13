import type { Money } from '../../../common/persistence/money';
import type { ListingStatus } from './listing-status';
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
  id: string;
  title: string;
  propertyType: PropertyType;
  rent: Money;
  bedrooms: number;
  /** "1.5" — a decimal string, never a float. */
  bathrooms: string;
  sizeSqft: number;
  city: ListingCity;
  neighborhood: string | null;
  availableFrom: Date;
  publishedAt: Date | null;
  coverPhotoUrl: string | null;
}

/** A row of the owner's dashboard. */
export interface ManagedListingCard extends ListingCard {
  status: ListingStatus;
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

export interface ListingDetail extends ListingCard {
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

/** A listing as its owner (or an admin) manages it. */
export interface ManagedListing extends ListingDetail {
  status: ListingStatus;
  address: ListingAddress;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/** Whose listings a dashboard shows — derived from the principal, never from the request. */
export type ListingScope =
  { kind: 'LANDLORD'; landlordId: string } | { kind: 'AGENCY'; agencyId: string } | { kind: 'ALL' };
