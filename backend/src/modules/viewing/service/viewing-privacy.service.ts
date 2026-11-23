import { Injectable } from '@nestjs/common';

import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AuditField, auditValue } from '@/modules/audit/service/audit-change';

import type { CancelledViewingRecord } from '../repository/record/viewing-privacy.record';
import { type ErasedParty, ViewingPrivacyRepository } from '../repository/viewing-privacy.repository';
import type { TenantViewingExport, ViewingParties } from './viewing.types';
import { MAX_EXPORTED_VIEWINGS } from './viewing-limits';
import { ViewingNotifier } from './viewing-notifier.service';
import { CancelledBy, isViewingStatus, ViewingStatus } from './viewing-status';

const toParties = (row: CancelledViewingRecord): ViewingParties => ({
    id: row.id,
    tenantId: row.tenantId,
    listing: { landlordId: row.landlordId, agencyId: row.agencyId },
});

/**
 * DATA-23: what the viewing module holds about a person — their viewings as a tenant, and the live
 * viewings on a landlord's homes — for the privacy module's export and erasure (CORE-16: exported).
 */
@Injectable()
export class ViewingPrivacyService {
    constructor(
        private readonly viewingPrivacyRepository: ViewingPrivacyRepository,
        private readonly auditService: AuditService,
        private readonly notifier: ViewingNotifier,
    ) {}

    /** API-22: the latest MAX_EXPORTED_VIEWINGS viewings the person asked for, latest slot first. */
    async exportFor(userId: string): Promise<TenantViewingExport[]> {
        const rows = await this.viewingPrivacyRepository.findByTenantForExport(userId, MAX_EXPORTED_VIEWINGS);
        return rows.flatMap((row) =>
            isViewingStatus(row.status)
                ? [
                      {
                          listingTitle: row.listing.title,
                          startsAt: row.startsAt,
                          endsAt: row.endsAt,
                          status: row.status,
                          message: row.message,
                      },
                  ]
                : [],
        );
    }

    /**
     * Joins the erasing transaction. The person's live viewings ahead are cancelled by them as a tenant, and those
     * on their homes by them as the owner (nobody would show the home); their words on any viewing are cleared.
     * Audited in one insert; the live channel is told after commit through `announce` — no email, the other side
     * sees the cancellation in the app (DATA-12).
     */
    async erase(userId: string, now: Date): Promise<ViewingParties[]> {
        const asTenant = await this.cancel({ kind: 'TENANT', tenantId: userId }, CancelledBy.TENANT, now, userId);
        const asOwner = await this.cancel({ kind: 'OWNER', landlordId: userId }, CancelledBy.OWNER, now, userId);
        await this.viewingPrivacyRepository.clearTenantTexts(userId);
        return [...asTenant, ...asOwner];
    }

    /** After commit: both sides' open tabs re-read the viewings that changed. */
    announce(viewings: readonly ViewingParties[]): void {
        for (const viewing of viewings) {
            this.notifier.changed(viewing);
        }
    }

    private async cancel(
        party: ErasedParty,
        cancelledBy: CancelledBy,
        now: Date,
        actorUserId: string,
    ): Promise<ViewingParties[]> {
        const rows = await this.viewingPrivacyRepository.cancelUpcoming(party, cancelledBy, now, actorUserId);
        await this.auditService.recordMany(
            rows.map((row) => ({
                action: AuditAction.VIEWING_CANCELLED,
                actorUserId,
                target: { type: AuditTargetType.VIEWING, id: row.id, label: row.title },
                subjectId: row.listingId,
                changes: [
                    {
                        field: AuditField.STATUS,
                        from: auditValue.status(row.previousStatus),
                        to: auditValue.status(ViewingStatus.CANCELLED),
                    },
                ],
            })),
        );
        return rows.map(toParties);
    }
}
