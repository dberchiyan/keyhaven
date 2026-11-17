import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { Pageable } from '@/common/dto/pageable';
import { Currency } from '@/common/persistence/money';
import { toPrismaPage } from '@/common/persistence/pageable';
import type { PrismaService } from '@/common/persistence/prisma.service';
import type { Prisma } from '@/generated/prisma/client';

import type { ManagedListingCriteria } from '../service/filter/listing.criteria';
import type { ListingDraft, ListingScope, ListingViewer } from '../service/listing.types';
import { MAX_CITIES } from '../service/listing-limits';
import type { ManagedListingSortField } from '../service/listing-sort';
import { ListingStatus } from '../service/listing-status';
import { managedListingWhere } from './listing-where';
import {
    type CityRecord,
    citySelect,
    type ListingStatusRecord,
    listingStatusSelect,
    type ManagedListingCardRecord,
    managedListingCardSelect,
    type ManagedListingRecord,
    managedListingSelect,
    type ViewerDetailRecord,
    viewerDetailSelect,
} from './record/listing.record';
import { type OwnedListingExportRecord, ownedListingExportSelect } from './record/listing-privacy.record';

const CONFIRMED_VIEWING_STATUS = 'CONFIRMED';

export interface ListingOwner {
    landlordId: string | null;
    agencyId: string | null;
}

const managedOrderBy = (
    field: ManagedListingSortField,
    direction: Prisma.SortOrder,
): Prisma.ListingOrderByWithRelationInput[] => [{ [field]: direction }];

/** Money and counts stay Decimal; the move-in day is already a UTC instant (DATA-20, DATA-21). */
const toColumns = (draft: ListingDraft): ListingDraft => ({
    title: draft.title,
    description: draft.description,
    propertyType: draft.propertyType,
    kind: draft.kind,
    price: draft.price,
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    sizeSqft: draft.sizeSqft,
    addressLine1: draft.addressLine1,
    addressLine2: draft.addressLine2,
    cityId: draft.cityId,
    neighborhood: draft.neighborhood,
    zip: draft.zip,
    isPetFriendly: draft.isPetFriendly,
    isFurnished: draft.isFurnished,
    hasParking: draft.hasParking,
    availableAt: draft.availableAt,
});

@Injectable()
export class ListingRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    findCities(): Promise<CityRecord[]> {
        return this.txHost.tx.city.findMany({
            select: citySelect,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take: MAX_CITIES,
        });
    }

    async cityExists(cityId: string): Promise<boolean> {
        const count = await this.txHost.tx.city.count({ where: { id: cityId } });
        return count > 0;
    }

    /**
     * DATA-15: the photo pipeline counts the gallery and takes the next position in separate statements, so two
     * concurrent confirmations (or intents) would read the same count — one would pass the limit it should fail, or
     * both would take the same position and one would die on the deferred unique at commit (lost update).
     */
    async lock(listingId: string): Promise<void> {
        await this.txHost.tx.$queryRaw`SELECT id FROM listings WHERE id = ${listingId}::uuid FOR UPDATE`;
    }

    /** SEC-6: the scope is part of the query. API-21: count and rows in parallel, they may differ by a row. */
    async findManagedPage(
        scope: ListingScope,
        criteria: ManagedListingCriteria,
        pageable: Pageable<ManagedListingSortField>,
    ): Promise<{ content: ManagedListingCardRecord[]; totalElements: number }> {
        const where = managedListingWhere(scope, criteria);
        const page = toPrismaPage(pageable, managedOrderBy, (direction) => ({ id: direction }));
        const [totalElements, content] = await Promise.all([
            this.txHost.tx.listing.count({ where }),
            this.txHost.tx.listing.findMany({ where, select: managedListingCardSelect, ...page }),
        ]);
        return { content, totalElements };
    }

    async countByStatus(scope: ListingScope): Promise<{ status: string; count: number }[]> {
        const groups = await this.txHost.tx.listing.groupBy({
            by: ['status'],
            where: managedListingWhere(scope, { searchTerms: [] }),
            _count: { _all: true },
        });
        return groups.map((group) => ({ status: group.status, count: group._count._all }));
    }

    /** A few rows (the insights' top list), returned in the order of the ids given. */
    async findManagedCardsByIds(ids: readonly string[]): Promise<ManagedListingCardRecord[]> {
        if (ids.length === 0) {
            return [];
        }
        const cards = await this.txHost.tx.listing.findMany({
            where: { id: { in: [...ids] } },
            select: managedListingCardSelect,
        });
        const byId = new Map(cards.map((card) => [card.id, card]));
        return ids.flatMap((id) => {
            const card = byId.get(id);
            return card ? [card] : [];
        });
    }

    findDetailById(id: string, viewerUserId: string | null): Promise<ViewerDetailRecord | null> {
        return this.txHost.tx.listing.findUnique({ where: { id }, select: viewerDetailSelect(viewerUserId) });
    }

    findManagedById(id: string): Promise<ManagedListingRecord | null> {
        return this.txHost.tx.listing.findUnique({ where: { id }, select: managedListingSelect });
    }

    findStatusById(id: string): Promise<ListingStatusRecord | null> {
        return this.txHost.tx.listing.findUnique({ where: { id }, select: listingStatusSelect });
    }

    async create(owner: ListingOwner, draft: ListingDraft, createdBy: string): Promise<string> {
        const { id } = await this.txHost.tx.listing.create({
            data: {
                ...toColumns(draft),
                landlordId: owner.landlordId,
                agencyId: owner.agencyId,
                currency: Currency.USD,
                status: ListingStatus.DRAFT,
                createdBy,
                updatedBy: createdBy,
            },
            select: { id: true },
        });
        return id;
    }

    /** DATA-16: false when the row changed meanwhile. */
    async update(id: string, version: number, draft: ListingDraft, updatedBy: string): Promise<boolean> {
        const { count } = await this.txHost.tx.listing.updateMany({
            where: { id, version },
            data: { ...toColumns(draft), updatedBy, version: { increment: 1 } },
        });
        return count > 0;
    }

    /** DATA-16: false when the row changed meanwhile; the published instant is kept unless one is given. */
    async updateStatus(
        id: string,
        version: number,
        status: string,
        publishedAt: Date | undefined,
        updatedBy: string,
    ): Promise<boolean> {
        const { count } = await this.txHost.tx.listing.updateMany({
            where: { id, version },
            data: {
                status,
                ...(publishedAt === undefined ? {} : { publishedAt }),
                updatedBy,
                version: { increment: 1 },
            },
        });
        return count > 0;
    }

    /**
     * A tenant with a confirmed viewing (ahead or already held) may see the address. The viewing module owns the
     * table; this is a read of one fact, so the listing module does not depend on it (CORE-17).
     */
    async hasConfirmedViewing(listingId: string, userId: string): Promise<boolean> {
        const count = await this.txHost.tx.viewing.count({
            where: { listingId, tenantId: userId, status: CONFIRMED_VIEWING_STATUS },
        });
        return count > 0;
    }

    /** One row per viewer and UTC day: the partial unique indexes make a repeat visit a no-op. */
    async recordView(listingId: string, viewer: ListingViewer, viewedAt: Date): Promise<void> {
        await this.txHost.tx.listingView.createMany({
            data: [
                viewer.kind === 'USER'
                    ? { listingId, userId: viewer.userId, visitorKey: null, viewedAt }
                    : { listingId, userId: null, visitorKey: viewer.visitorKey, viewedAt },
            ],
            skipDuplicates: true,
        });
    }

    /** A landlord's own listings (not an agency's), newest first, at most `take`. */
    findOwnedByLandlord(landlordId: string, take: number): Promise<OwnedListingExportRecord[]> {
        return this.txHost.tx.listing.findMany({
            where: { landlordId },
            select: ownedListingExportSelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
        });
    }

    /** One statement for every published listing of the landlord; returns what it unpublished. */
    unpublishAllOfLandlord(landlordId: string, updatedBy: string): Promise<{ id: string; title: string }[]> {
        return this.txHost.tx.listing.updateManyAndReturn({
            where: { landlordId, status: ListingStatus.PUBLISHED },
            data: { status: ListingStatus.UNPUBLISHED, updatedBy, version: { increment: 1 } },
            select: { id: true, title: true },
        });
    }

    /** The person's own visits; anonymous visitors' rows carry no user and stay. */
    async deleteViewsByUser(userId: string): Promise<number> {
        const { count } = await this.txHost.tx.listingView.deleteMany({ where: { userId } });
        return count;
    }
}
