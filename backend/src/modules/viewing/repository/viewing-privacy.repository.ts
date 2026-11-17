import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from '@/common/persistence/prisma.service';
import { Prisma } from '@/generated/prisma/client';

import { ACTIVE_VIEWING_STATUSES, CancelledBy, ViewingStatus } from '../service/viewing-status';
import {
    type CancelledViewingRecord,
    cancelledViewingRowsSchema,
    type TenantViewingExportRecord,
    tenantViewingExportSelect,
} from './record/viewing-privacy.record';

export type ErasedParty = { kind: 'TENANT'; tenantId: string } | { kind: 'OWNER'; landlordId: string };

/** Whose live viewings an erasure calls off: the person's own as a tenant, or those on a landlord's homes. */
const partySql = (party: ErasedParty): Prisma.Sql =>
    party.kind === 'TENANT'
        ? Prisma.sql`v.tenant_id = ${party.tenantId}::uuid`
        : Prisma.sql`l.landlord_id = ${party.landlordId}::uuid`;

/** DATA-23: the viewing rows an account's export reads and its erasure changes. */
@Injectable()
export class ViewingPrivacyRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    /** A tenant's viewings, latest slot first, at most `take`. */
    findByTenantForExport(tenantId: string, take: number): Promise<TenantViewingExportRecord[]> {
        return this.txHost.tx.viewing.findMany({
            where: { tenantId },
            select: tenantViewingExportSelect,
            orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
            take,
        });
    }

    /**
     * DATA-3: one statement cancels every live viewing ahead for the party and returns what it changed, with the
     * status it had (for the audit) and both sides (for the live channel). Raw SQL: Prisma cannot return the row's
     * previous value. DATA-8: the result is bounded by the data — a tenant has at most MAX_ACTIVE_VIEWINGS ahead, a
     * landlord's homes only the slots of their booking horizon.
     */
    async cancelUpcoming(
        party: ErasedParty,
        cancelledBy: CancelledBy,
        now: Date,
        actorUserId: string,
    ): Promise<CancelledViewingRecord[]> {
        const rows = await this.txHost.tx.$queryRaw<unknown[]>`
      WITH due AS (
        SELECT v.id, v.status
          FROM viewings v
          JOIN listings l ON l.id = v.listing_id
         WHERE ${partySql(party)}
           AND v.status = ANY(${[...ACTIVE_VIEWING_STATUSES]}::text[])
           AND v.starts_at > ${now}::timestamptz
           FOR UPDATE OF v
      )
      UPDATE viewings v
         SET status = ${ViewingStatus.CANCELLED},
             cancelled_by = ${cancelledBy},
             note = NULL,
             decided_at = ${now}::timestamptz,
             updated_at = ${now}::timestamptz,
             updated_by = ${actorUserId}::uuid,
             version = v.version + 1
        FROM due, listings l
       WHERE v.id = due.id AND l.id = v.listing_id
      RETURNING v.id, due.status AS "previousStatus", v.tenant_id AS "tenantId",
                l.landlord_id AS "landlordId", l.agency_id AS "agencyId", l.title`;
        return cancelledViewingRowsSchema.parse(rows);
    }

    /** The tenant's own words on every viewing: their request message, and the note of a cancellation they made. */
    async clearTenantTexts(tenantId: string): Promise<void> {
        await this.txHost.tx.viewing.updateMany({
            where: { tenantId, message: { not: null } },
            data: { message: null, updatedBy: tenantId, version: { increment: 1 } },
        });
        await this.txHost.tx.viewing.updateMany({
            where: { tenantId, cancelledBy: CancelledBy.TENANT, note: { not: null } },
            data: { note: null, updatedBy: tenantId, version: { increment: 1 } },
        });
    }
}
