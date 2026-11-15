import type { ListingKind } from '../../listing/service/listing-kind';
import type { ViewingScheduleDocument, ViewingWindow } from './viewing-schedule';
import type { CancelledBy, ViewingStatus } from './viewing-status';

export type { ViewingWindow };

/** The owner's hours of one listing, with the zone they are written in. */
export interface ViewingSchedule extends ViewingScheduleDocument {
  listingId: string;
  /** The city's IANA zone: the windows are local minutes of its days. */
  timeZone: string;
  updatedAt: Date;
  version: number;
}

export interface SaveScheduleCommand extends ViewingScheduleDocument {
  /** The version the owner edited; null when the listing has no hours yet. */
  version: number | null;
}

export interface ViewingSlot {
  startsAt: Date;
  endsAt: Date;
}

export interface ViewingSlotDay {
  /** A local day of the city, `YYYY-MM-DD`. */
  day: string;
  slots: ViewingSlot[];
}

/** What a tenant can book: the open slots of the coming days, or nothing when there are no hours. */
export interface ViewingSlots {
  /** False when the listing has no viewing hours (then `days` is empty). */
  open: boolean;
  timeZone: string;
  slotMinutes: number | null;
  noticeHours: number;
  /** The last local day slots are offered for. */
  horizonEnd: string;
  from: string;
  days: ViewingSlotDay[];
}

export interface ViewingListing {
  id: string;
  title: string;
  kind: ListingKind;
  coverPhotoUrl: string | null;
  neighborhood: string | null;
  city: { name: string; state: string; slug: string; timeZone: string };
  /** The private address: the owner's side always, the tenant's once the viewing is confirmed. */
  address: { line1: string; line2: string | null } | null;
  demo: boolean;
}

/** Who asked — shown to the owner and admins, never to another tenant. */
export interface ViewingTenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface Viewing {
  id: string;
  status: ViewingStatus;
  startsAt: Date;
  endsAt: Date;
  message: string | null;
  note: string | null;
  cancelledBy: CancelledBy | null;
  decidedAt: Date | null;
  createdAt: Date;
  version: number;
  listing: ViewingListing;
  /** Null on the tenant's own view (they know who they are). */
  tenant: ViewingTenant | null;
}

export interface ViewingPage {
  content: Viewing[];
  totalElements: number;
}

/** The dashboard's badge figures: requests waiting, confirmed viewings ahead. */
export interface ViewingSummary {
  requested: number;
  upcoming: number;
}

export interface RequestViewingCommand {
  listingId: string;
  startsAt: Date;
  message: string | null;
}

/** Whose viewings the dashboard lists — the caller's scope, never a filter afterwards. */
export type ViewingScope =
  { kind: 'LANDLORD'; landlordId: string } | { kind: 'AGENCY'; agencyId: string } | { kind: 'ALL' };

export interface ViewingCriteria {
  status?: ViewingStatus;
  listingId?: string;
  /** Only viewings that start after now (requests and confirmed ones ahead). */
  upcoming?: boolean;
}

/** Who reads the viewing: the tenant's side hides the tenant block and the address until confirmed. */
export type ViewingAudience = 'TENANT' | 'OWNER';
