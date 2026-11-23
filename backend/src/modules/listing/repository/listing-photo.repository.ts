import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from '@/common/persistence/prisma.service';

import { MAX_PENDING_PHOTOS, MAX_PHOTOS, PhotoStatus } from '../service/photo-status';
import {
    type ManagedPhotoRecord,
    managedPhotoSelect,
    type PhotoUploadRecord,
    photoUploadSelect,
} from './record/listing.record';

/** DATA-40: the hourly cleanup is bounded; what is left waits for the next run. */
const MAX_EXPIRED_PER_RUN = 200;

@Injectable()
export class ListingPhotoRepository {
    constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>) {}

    findByListing(listingId: string): Promise<ManagedPhotoRecord[]> {
        return this.txHost.tx.listingPhoto.findMany({
            where: { listingId },
            select: managedPhotoSelect,
            orderBy: [{ position: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
            take: MAX_PHOTOS + MAX_PENDING_PHOTOS,
        });
    }

    findUpload(listingId: string, photoId: string): Promise<PhotoUploadRecord | null> {
        return this.txHost.tx.listingPhoto.findFirst({
            where: { id: photoId, listingId },
            select: photoUploadSelect,
        });
    }

    countReady(listingId: string): Promise<number> {
        return this.txHost.tx.listingPhoto.count({
            where: { listingId, status: PhotoStatus.READY },
        });
    }

    countPending(listingId: string): Promise<number> {
        return this.txHost.tx.listingPhoto.count({
            where: { listingId, status: PhotoStatus.PENDING },
        });
    }

    async nextPosition(listingId: string): Promise<number> {
        const last = await this.txHost.tx.listingPhoto.aggregate({
            where: { listingId, status: PhotoStatus.READY },
            _max: { position: true },
        });
        return (last._max.position ?? -1) + 1;
    }

    async createIntent(
        listingId: string,
        storageKey: string,
        contentType: string,
        sizeBytes: number,
        createdBy: string,
    ): Promise<string> {
        const { id } = await this.txHost.tx.listingPhoto.create({
            data: {
                listingId,
                storageKey,
                contentType,
                sizeBytes,
                status: PhotoStatus.PENDING,
                position: null,
                createdBy,
            },
            select: { id: true },
        });
        return id;
    }

    /** False when the row is no longer pending (confirmed meanwhile). */
    async markReady(photoId: string, position: number, sizeBytes: number, actorId: string): Promise<boolean> {
        const { count } = await this.txHost.tx.listingPhoto.updateMany({
            where: { id: photoId, status: PhotoStatus.PENDING },
            data: { status: PhotoStatus.READY, position, sizeBytes, updatedBy: actorId, version: { increment: 1 } },
        });
        return count > 0;
    }

    /**
     * One statement for the whole order: the unique (listing, position) constraint is deferred to commit, so swaps
     * do not collide midway (`uq_listing_photos_listing_id_position` is DEFERRABLE INITIALLY DEFERRED).
     */
    async reorder(listingId: string, orderedIds: readonly string[], now: Date, actorId: string): Promise<void> {
        await this.txHost.tx.$executeRaw`
      UPDATE listing_photos p
      SET position = o.ord::int - 1, updated_at = ${now}, updated_by = ${actorId}::uuid, version = p.version + 1
      FROM unnest(${[...orderedIds]}::uuid[]) WITH ORDINALITY AS o(id, ord)
      WHERE p.id = o.id AND p.listing_id = ${listingId}::uuid AND p.status = ${PhotoStatus.READY}
        AND p.position IS DISTINCT FROM o.ord::int - 1`;
    }

    /** The remaining ready photos close the gap in one statement, so positions stay dense. */
    async remove(listingId: string, photoId: string, now: Date, actorId: string): Promise<void> {
        await this.txHost.tx.listingPhoto.deleteMany({ where: { id: photoId, listingId } });
        await this.txHost.tx.$executeRaw`
      WITH ordered AS (
        SELECT id, row_number() OVER (ORDER BY position) - 1 AS new_position
        FROM listing_photos WHERE listing_id = ${listingId}::uuid AND status = ${PhotoStatus.READY})
      UPDATE listing_photos p
      SET position = ordered.new_position, updated_at = ${now}, updated_by = ${actorId}::uuid, version = p.version + 1
      FROM ordered WHERE p.id = ordered.id AND p.position <> ordered.new_position`;
    }

    /** The objects are removed by the caller, outside the transaction (DATA-12). */
    findExpiredIntents(before: Date): Promise<PhotoUploadRecord[]> {
        return this.txHost.tx.listingPhoto.findMany({
            where: { status: PhotoStatus.PENDING, createdAt: { lt: before } },
            select: photoUploadSelect,
            orderBy: { createdAt: 'asc' },
            take: MAX_EXPIRED_PER_RUN,
        });
    }

    /** Only intents go: a row confirmed in the meantime keeps its ready photo. */
    async deletePendingByIds(ids: string[]): Promise<void> {
        if (ids.length > 0) {
            await this.txHost.tx.listingPhoto.deleteMany({
                where: { id: { in: ids }, status: PhotoStatus.PENDING },
            });
        }
    }
}
