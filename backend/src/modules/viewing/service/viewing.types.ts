import type { ListingKind } from '@/modules/listing/service/listing-kind';

import type { ViewingScheduleDocument } from './viewing-schedule';
import type { CancelledBy, ViewingStatus, ViewingTransition } from './viewing-status';

export interface ViewingSchedule extends ViewingScheduleDocument {
    listingId: string;
    timeZone: string;
    updatedAt: Date;
    version: number;
}

export interface SaveScheduleCommand extends ViewingScheduleDocument {
    version: number | null;
}

export interface ViewingSlot {
    startsAt: Date;
    endsAt: Date;
}

export interface ViewingSlotDay {
    day: string;
    slots: ViewingSlot[];
}

export interface ViewingSlots {
    isOpen: boolean;
    timeZone: string;
    slotMinutes: number | null;
    noticeHours: number;
    horizonEndsOn: string;
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
    address: { line1: string; line2: string | null } | null;
    isDemo: boolean;
}

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
    tenant: ViewingTenant | null;
}

export interface ViewingPage {
    content: Viewing[];
    totalElements: number;
}

export interface ViewingSummary {
    requested: number;
    upcoming: number;
}

export interface RequestViewingCommand {
    listingId: string;
    startsAt: Date;
    message: string | null;
}

export type ViewingScope =
    { kind: 'LANDLORD'; landlordId: string } | { kind: 'AGENCY'; agencyId: string } | { kind: 'ALL' };

export interface ViewingCriteria {
    status?: ViewingStatus;
    listingId?: string;
    isUpcoming?: boolean;
}

export type ViewingAudience = 'TENANT' | 'OWNER';

export interface ViewingRecipient {
    email: string;
    firstName: string;
}

export interface MappedViewing {
    viewing: Viewing;
    owner: ViewingRecipient | undefined;
}

export interface ViewingDecision {
    transition: ViewingTransition;
    note: string | null;
}

export interface ViewingParties {
    id: string;
    tenantId: string;
    listing: { landlordId: string | null; agencyId: string | null };
}

export interface TenantViewingExport {
    listingTitle: string;
    startsAt: Date;
    endsAt: Date;
    status: ViewingStatus;
    message: string | null;
}
