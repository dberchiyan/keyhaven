import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import type { Pageable } from '@/common/dto/pageable';
import { ConcurrentModificationException, ResourceNotFoundException } from '@/common/exception/api.exception';
import type { Actor } from '@/common/security/actor';
import { Clock } from '@/common/time/clock';
import { toUtcDay } from '@/common/time/utc-day';
import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue, changeOf } from '@/modules/audit/service/audit-change';
import { UserRole } from '@/modules/user/service/user-role';

import { ListingRepository } from '../repository/listing.repository';
import { ListingPhotoRepository } from '../repository/listing-photo.repository';
import { ListingSearchRepository } from '../repository/listing-search.repository';
import type { ViewerCardRecord, ViewerDetailRecord } from '../repository/record/listing.record';
import type { ListingCriteria, ManagedListingCriteria } from './filter/listing.criteria';
import type {
    ListingCard,
    ListingCity,
    ListingDetail,
    ListingDraft,
    ListingViewer,
    ManagedListing,
    ManagedListingCard,
    UpdateListingCommand,
} from './listing.types';
import { ListingCardService, toCity } from './listing-card.service';
import { ListingError } from './listing-errors';
import { MAX_SEARCH_TERMS } from './listing-limits';
import { ListingMarketService } from './listing-market.service';
import { scopeOf } from './listing-scope';
import type { ListingSortField, ManagedListingSortField } from './listing-sort';
import {
    EDITABLE_STATUSES,
    isListingStatus,
    LISTING_TRANSITIONS,
    ListingStatus,
    type ListingTransition,
} from './listing-status';

const TRANSITION_ACTION: Readonly<Record<ListingTransition, AuditAction>> = {
    publish: AuditAction.LISTING_PUBLISHED,
    unpublish: AuditAction.LISTING_UNPUBLISHED,
    suspend: AuditAction.LISTING_SUSPENDED,
};

/** API-22: the free text is cut into a bounded number of terms; empty ones are dropped. */
export const toSearchTerms = (search: string | undefined): string[] =>
    (search ?? '')
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
        .slice(0, MAX_SEARCH_TERMS);

/** DATA-21: a view row's day is the UTC calendar day, stored as its midnight. */
const startOfUtcDay = (now: Date): Date => new Date(`${toUtcDay(now)}T00:00:00Z`);

/** The catalogue and the owner's listings; photos, insights and comparable homes have their own services. */
@Injectable()
export class ListingService {
    constructor(
        private readonly listingRepository: ListingRepository,
        private readonly searchRepository: ListingSearchRepository,
        private readonly photoRepository: ListingPhotoRepository,
        private readonly cardService: ListingCardService,
        private readonly marketService: ListingMarketService,
        private readonly auditService: AuditService,
        private readonly clock: Clock,
        @InjectPinoLogger(ListingService.name) private readonly logger: PinoLogger,
    ) {}

    async cities(): Promise<ListingCity[]> {
        return (await this.listingRepository.findCities()).map(toCity);
    }

    /** Everyone, signed in or not, searches published listings; `saved` is the viewer's own. */
    async search(
        criteria: ListingCriteria,
        pageable: Pageable<ListingSortField>,
        viewerUserId: string | null,
    ): Promise<{ content: ListingCard[]; totalElements: number }> {
        const page = await this.searchRepository.findPublishedPage(criteria, pageable, viewerUserId);
        return {
            content: page.content.map((listing) => this.cardService.toViewerCard(listing)),
            totalElements: page.totalElements,
        };
    }

    /**
     * The policy admitted the viewer (published, or theirs, or an admin). The exact address is shown to the owner,
     * the agency's agents, admins and a tenant whose viewing was confirmed. Anyone else's visit counts as a view,
     * once per viewer and day; a visitor without an account is known by a daily hash.
     */
    async findForViewer(listingId: string, visitorKey: string, actor: Actor | undefined): Promise<ListingDetail> {
        const listing = await this.findDetail(listingId, actor?.userId ?? null);
        const isOwnerSide = actor ? this.ownsOrAdministers(listing, actor) : false;
        if (!isOwnerSide) {
            const viewer: ListingViewer = actor
                ? { kind: 'USER', userId: actor.userId }
                : { kind: 'VISITOR', visitorKey };
            await this.listingRepository.recordView(listingId, viewer, startOfUtcDay(this.clock.now()));
        }
        const canSeeAddress =
            isOwnerSide ||
            (actor !== undefined && (await this.listingRepository.hasConfirmedViewing(listingId, actor.userId)));
        const address = canSeeAddress ? { line1: listing.addressLine1, line2: listing.addressLine2 } : null;
        return {
            ...this.cardService.toDetail(listing, address, listing.savedBy.length > 0),
            priceContext: await this.marketService.priceContextOf(listing),
        };
    }

    /** The policy admitted the id; "saved" is the viewer's own. */
    async findSimilar(listingId: string, viewerUserId: string | null): Promise<ListingCard[]> {
        const listing = await this.findDetail(listingId, null);
        const ids = await this.marketService.findSimilarIds(listing);
        return this.findCards(ids, viewerUserId);
    }

    /** Only homes still on the site, latest view first. */
    async findRecentlyViewed(userId: string): Promise<ListingCard[]> {
        const ids = await this.searchRepository.findRecentlyViewedIds(userId);
        return this.findCards(ids, userId);
    }

    /** A visitor keeps their own "recently viewed" ids in the browser; the cards keep that order. */
    async findCards(ids: readonly string[], viewerUserId: string | null): Promise<ListingCard[]> {
        const cards = await this.searchRepository.findCardsByIds(ids, viewerUserId);
        return cards.map((card) => this.cardService.toViewerCard(card));
    }

    /** The saved-listings service of this module loads its own records and needs the same card. */
    cardOf(listing: ViewerCardRecord): ListingCard {
        return this.cardService.toViewerCard(listing);
    }

    /** SEC-6: the caller's scope (landlord, agency, everything for admins) is part of the query. */
    async findManagedPage(
        criteria: ManagedListingCriteria,
        pageable: Pageable<ManagedListingSortField>,
        actor: Actor,
    ): Promise<{ content: ManagedListingCard[]; totalElements: number }> {
        const page = await this.listingRepository.findManagedPage(scopeOf(actor), criteria, pageable);
        return {
            content: page.content.map((listing) => this.cardService.toManagedCard(listing)),
            totalElements: page.totalElements,
        };
    }

    /** Every status is present, a status without listings as 0, so the dashboard's tabs need no guessing. */
    async countByStatus(actor: Actor): Promise<Record<ListingStatus, number>> {
        const counts = await this.listingRepository.countByStatus(scopeOf(actor));
        const result: Record<ListingStatus, number> = {
            [ListingStatus.DRAFT]: 0,
            [ListingStatus.PUBLISHED]: 0,
            [ListingStatus.UNPUBLISHED]: 0,
            [ListingStatus.SUSPENDED]: 0,
        };
        for (const { status, count } of counts) {
            if (isListingStatus(status)) {
                result[status] = count;
            }
        }
        return result;
    }

    /** The policy checked ownership, so the address is included. */
    async findManaged(listingId: string): Promise<ManagedListing> {
        const [listing, photos] = await Promise.all([
            this.listingRepository.findManagedById(listingId),
            this.photoRepository.findByListing(listingId),
        ]);
        if (!listing) {
            throw new ResourceNotFoundException();
        }
        return {
            ...this.cardService.toManaged(listing, photos),
            priceContext: await this.marketService.priceContextOf(listing),
        };
    }

    /** A landlord's own DRAFT or the agent's agency's — the owner never comes from the request. */
    async create(draft: ListingDraft, actor: Actor): Promise<ManagedListing> {
        await this.assertCity(draft.cityId);
        const id = await this.createDraft(draft, actor);
        this.logger.info({ listingId: id, by: actor.userId }, 'Listing created');
        return this.findManaged(id);
    }

    /** DATA-16: the owner's edit is optimistic; a suspended listing is no longer theirs to shape. */
    async update(listingId: string, command: UpdateListingCommand, actor: Actor): Promise<ManagedListing> {
        await this.assertCity(command.cityId);
        await this.applyUpdate(listingId, command, actor);
        return this.findManaged(listingId);
    }

    /**
     * CORE-21: the transition table decides. API-4: repeating the same decision is a no-op answering the current
     * state; anything the table refuses — publishing a suspended listing — is 422. Publishing needs a photo.
     */
    @Transactional()
    async transition(listingId: string, transition: ListingTransition, actor: Actor): Promise<ManagedListing> {
        const current = await this.listingRepository.findStatusById(listingId);
        if (!current || !isListingStatus(current.status)) {
            throw new ResourceNotFoundException();
        }
        const rule = LISTING_TRANSITIONS[transition];
        if (current.status === rule.to) {
            return this.findManaged(listingId);
        }
        if (!(rule.from as readonly ListingStatus[]).includes(current.status)) {
            throw ListingError.transitionNotAllowed(transition, current.status);
        }
        if (transition === 'publish' && (await this.photoRepository.countReady(listingId)) === 0) {
            throw ListingError.needsPhoto();
        }
        const publishedAt = transition === 'publish' ? this.clock.now() : undefined;
        if (
            !(await this.listingRepository.updateStatus(listingId, current.version, rule.to, publishedAt, actor.userId))
        ) {
            throw new ConcurrentModificationException();
        }
        await this.auditService.record({
            action: TRANSITION_ACTION[transition],
            target: { type: AuditTargetType.LISTING, id: listingId, label: current.title },
            subjectId: listingId,
            changes: changeOf(AuditField.STATUS, auditValue.status(current.status), auditValue.status(rule.to)),
        });
        this.logger.info({ listingId, transition, by: actor.userId }, 'Listing status changed');
        return this.findManaged(listingId);
    }

    @Transactional()
    private async createDraft(draft: ListingDraft, actor: Actor): Promise<string> {
        const scope = scopeOf(actor);
        const owner =
            scope.kind === 'AGENCY'
                ? { landlordId: null, agencyId: scope.agencyId }
                : { landlordId: actor.userId, agencyId: null };
        const id = await this.listingRepository.create(owner, draft, actor.userId);
        await this.auditService.record({
            action: AuditAction.LISTING_CREATED,
            target: { type: AuditTargetType.LISTING, id, label: draft.title },
            subjectId: id,
            changes: changeOf(AuditField.STATUS, null, auditValue.status(ListingStatus.DRAFT)),
        });
        return id;
    }

    @Transactional()
    private async applyUpdate(listingId: string, command: UpdateListingCommand, actor: Actor): Promise<void> {
        const current = await this.listingRepository.findStatusById(listingId);
        if (!current || !isListingStatus(current.status)) {
            throw new ResourceNotFoundException();
        }
        if (!(EDITABLE_STATUSES as readonly ListingStatus[]).includes(current.status)) {
            throw ListingError.notEditable(current.status);
        }
        if (current.version !== command.version) {
            throw new ConcurrentModificationException();
        }
        const { version, ...draft } = command;
        if (!(await this.listingRepository.update(listingId, version, draft, actor.userId))) {
            throw new ConcurrentModificationException();
        }
        await this.auditService.record({
            action: AuditAction.LISTING_UPDATED,
            target: { type: AuditTargetType.LISTING, id: listingId, label: draft.title },
            subjectId: listingId,
            changes: [],
        });
    }

    private async assertCity(cityId: string): Promise<void> {
        if (!(await this.listingRepository.cityExists(cityId))) {
            throw ListingError.cityNotFound();
        }
    }

    private async findDetail(listingId: string, viewerUserId: string | null): Promise<ViewerDetailRecord> {
        const listing = await this.listingRepository.findDetailById(listingId, viewerUserId);
        if (!listing) {
            throw new ResourceNotFoundException();
        }
        return listing;
    }

    private ownsOrAdministers(listing: { landlordId: string | null; agencyId: string | null }, actor: Actor): boolean {
        if (actor.role === UserRole.ADMIN) {
            return true;
        }
        const scope = scopeOf(actor);
        return (
            (scope.kind === 'LANDLORD' && listing.landlordId === scope.landlordId) ||
            (scope.kind === 'AGENCY' && listing.agencyId === scope.agencyId)
        );
    }
}
