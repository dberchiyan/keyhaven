import { Injectable } from '@nestjs/common';

import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue } from '@/modules/audit/service/audit-change';

import { ListingRepository } from '../repository/listing.repository';
import { SavedListingRepository } from '../repository/saved-listing.repository';
import { MAX_EXPORTED_LISTINGS, MAX_EXPORTED_SAVED_HOMES } from './listing-limits';
import type { ListingDataExport } from './listing-privacy.types';
import { isListingStatus, ListingStatus } from './listing-status';

/**
 * DATA-23: what the listing module holds about a person — saved homes, the homes they looked at,
 * a landlord's own listings — for the privacy module's export and erasure (CORE-16: exported; the
 * privacy module never reads listing's tables itself).
 */
@Injectable()
export class ListingPrivacyService {
    constructor(
        private readonly listingRepository: ListingRepository,
        private readonly savedListingRepository: SavedListingRepository,
        private readonly auditService: AuditService,
    ) {}

    /** API-22: both lists bounded (MAX_EXPORTED_SAVED_HOMES, MAX_EXPORTED_LISTINGS), newest first. */
    async exportFor(userId: string): Promise<ListingDataExport> {
        const [saved, owned] = await Promise.all([
            this.savedListingRepository.findForExport(userId, MAX_EXPORTED_SAVED_HOMES),
            this.listingRepository.findOwnedByLandlord(userId, MAX_EXPORTED_LISTINGS),
        ]);
        return {
            savedHomes: saved.map((row) => ({
                listingId: row.listingId,
                title: row.listing.title,
                savedAt: row.createdAt,
            })),
            listings: owned.flatMap((row) =>
                isListingStatus(row.status)
                    ? [{ id: row.id, title: row.title, status: row.status, createdAt: row.createdAt }]
                    : [],
            ),
        };
    }

    /**
     * Joins the erasing transaction: saved homes and the person's visits go; a landlord's published homes leave the
     * site (nobody would answer for them) — one UPDATE and one audit insert for the batch (DATA-3).
     */
    async erase(userId: string): Promise<void> {
        await this.savedListingRepository.deleteByUser(userId);
        await this.listingRepository.deleteViewsByUser(userId);
        const unpublished = await this.listingRepository.unpublishAllOfLandlord(userId, userId);
        await this.auditService.recordMany(
            unpublished.map((listing) => ({
                action: AuditAction.LISTING_UNPUBLISHED,
                actorUserId: userId,
                target: { type: AuditTargetType.LISTING, id: listing.id, label: listing.title },
                subjectId: listing.id,
                changes: [
                    {
                        field: AuditField.STATUS,
                        from: auditValue.status(ListingStatus.PUBLISHED),
                        to: auditValue.status(ListingStatus.UNPUBLISHED),
                    },
                ],
            })),
        );
    }
}
