import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/common/config/app-config.service';
import type { Pageable } from '@/common/dto/pageable';
import { ResourceNotFoundException } from '@/common/exception/api.exception';
import type { Principal } from '@/common/security/principal';
import { isListingKind, ListingKind } from '@/modules/listing/service/listing-kind';
import { ObjectStorage } from '@/modules/storage/service/object-storage';

import type { ViewingRecord } from '../repository/record/viewing.record';
import { ViewingRepository } from '../repository/viewing.repository';
import type {
    MappedViewing,
    Viewing,
    ViewingAudience,
    ViewingCriteria,
    ViewingListing,
    ViewingPage,
    ViewingRecipient,
    ViewingSummary,
} from './viewing.types';
import { viewingAudienceOf, viewingScopeOf } from './viewing-audience';
import type { ViewingSortField } from './viewing-sort';
import { CancelledBy, isViewingStatus, ViewingStatus } from './viewing-status';

export interface LoadedViewing extends MappedViewing {
    record: ViewingRecord;
}

const cancelledByOf = (record: ViewingRecord): CancelledBy | null =>
    record.cancelledBy === CancelledBy.TENANT || record.cancelledBy === CancelledBy.OWNER ? record.cancelledBy : null;

/** The owner's inbox for emails (the landlord, or the agency's address); never part of a DTO. */
const ownerOf = (record: ViewingRecord): ViewingRecipient | undefined => {
    if (record.listing.landlord) {
        return { email: record.listing.landlord.email, firstName: record.listing.landlord.firstName };
    }
    return record.listing.agency
        ? { email: record.listing.agency.email, firstName: record.listing.agency.name }
        : undefined;
};

/** Reading viewings: the tenant's own, the owner's dashboard, one home's, one by id — each as its audience sees it. */
@Injectable()
export class ViewingQueryService {
    constructor(
        private readonly viewingRepository: ViewingRepository,
        private readonly storage: ObjectStorage,
        private readonly config: AppConfigService,
    ) {}

    /** A tenant's own viewings, latest slot first (the client splits ahead and past). */
    async listOwn(userId: string): Promise<Viewing[]> {
        const records = await this.viewingRepository.findByTenant(userId);
        return records.map((record) => this.toView(record, 'TENANT').viewing);
    }

    async findOne(principal: Principal, viewingId: string): Promise<Viewing> {
        return (await this.load(viewingId, viewingAudienceOf(principal))).viewing;
    }

    /** The dashboard's page over the caller's scope. */
    async managedPage(
        principal: Principal,
        criteria: ViewingCriteria,
        pageable: Pageable<ViewingSortField>,
    ): Promise<ViewingPage> {
        const page = await this.viewingRepository.findPage(viewingScopeOf(principal), criteria, pageable, new Date());
        return {
            content: page.content.map((record) => this.toView(record, 'OWNER').viewing),
            totalElements: page.totalElements,
        };
    }

    summary(principal: Principal): Promise<ViewingSummary> {
        return this.viewingRepository.countSummary(viewingScopeOf(principal), new Date());
    }

    /** One home's live viewings ahead, for its management page (the policy checked ownership). */
    async listForListing(listingId: string): Promise<Viewing[]> {
        const records = await this.viewingRepository.findUpcomingByListing(listingId, new Date());
        return records.map((record) => this.toView(record, 'OWNER').viewing);
    }

    async load(viewingId: string, audience: ViewingAudience): Promise<LoadedViewing> {
        const record = await this.viewingRepository.findById(viewingId);
        if (!record) {
            throw new ResourceNotFoundException();
        }
        return { ...this.toView(record, audience), record };
    }

    /** The viewing as the audience sees it, plus the owner's inbox (for emails, never in a DTO). */
    toView(record: ViewingRecord, audience: ViewingAudience): MappedViewing {
        const status = isViewingStatus(record.status) ? record.status : ViewingStatus.EXPIRED;
        const viewing: Viewing = {
            id: record.id,
            status,
            startsAt: record.startsAt,
            endsAt: record.endsAt,
            message: record.message,
            note: record.note,
            cancelledBy: cancelledByOf(record),
            decidedAt: record.decidedAt,
            createdAt: record.createdAt,
            version: record.version,
            listing: this.toListing(record, audience === 'OWNER' || status === ViewingStatus.CONFIRMED),
            tenant: audience === 'OWNER' ? record.tenant : null,
        };
        return { viewing, owner: ownerOf(record) };
    }

    private toListing(record: ViewingRecord, withAddress: boolean): ViewingListing {
        const { listing } = record;
        const cover = listing.photos[0];
        const coverStorageUrl = cover?.storageKey ? this.storage.publicUrl(cover.storageKey) : null;
        return {
            id: listing.id,
            title: listing.title,
            kind: isListingKind(listing.kind) ? listing.kind : ListingKind.RENT,
            coverPhotoUrl: cover ? (cover.url ?? coverStorageUrl) : null,
            neighborhood: listing.neighborhood,
            city: listing.city,
            address: withAddress ? { line1: listing.addressLine1, line2: listing.addressLine2 } : null,
            isDemo: this.config.isDemo && listing.isDemo,
        };
    }
}
