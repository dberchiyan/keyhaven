import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../../common/persistence/prisma.service';
import { MAX_PENDING_PHOTOS, MAX_PHOTOS, PhotoStatus } from '../service/photo-status';
import {
  type ManagedPhotoRecord,
  managedPhotoSelect,
  type PhotoUploadRecord,
  photoUploadSelect,
} from './record/listing.record';

/** Abandoned intents removed per hourly run (platform.md → bounded jobs). */
const MAX_EXPIRED_PER_RUN = 200;

@Injectable()
export class ListingPhotoRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  /** Every photo of the listing: ready ones in order, then pending intents (bounded). */
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

  /** The next free slot: one past the highest position. */
  async nextPosition(listingId: string): Promise<number> {
    const last = await this.txHost.tx.listingPhoto.aggregate({
      where: { listingId, status: PhotoStatus.READY },
      _max: { position: true },
    });
    return (last._max.position ?? -1) + 1;
  }

  /** An upload intent: a PENDING row with its storage key; returns the photo id. */
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

  /** PENDING → READY at the given position; false when the row is no longer pending. */
  async markReady(photoId: string, position: number, sizeBytes: number): Promise<boolean> {
    const { count } = await this.txHost.tx.listingPhoto.updateMany({
      where: { id: photoId, status: PhotoStatus.PENDING },
      data: { status: PhotoStatus.READY, position, sizeBytes },
    });
    return count > 0;
  }

  /**
   * The new order of the listing's ready photos in one statement; the unique (listing, position)
   * constraint is deferred to commit, so swaps are fine (migration listing_photo_order_deferrable).
   */
  async reorder(listingId: string, orderedIds: readonly string[]): Promise<void> {
    await this.txHost.tx.$executeRaw`
      UPDATE listing_photos p SET position = o.ord::int - 1
      FROM unnest(${[...orderedIds]}::uuid[]) WITH ORDINALITY AS o(id, ord)
      WHERE p.id = o.id AND p.listing_id = ${listingId}::uuid AND p.status = ${PhotoStatus.READY}`;
  }

  /** Removes one photo; the remaining ready ones close the gap (one statement). */
  async remove(listingId: string, photoId: string): Promise<void> {
    await this.txHost.tx.listingPhoto.deleteMany({ where: { id: photoId, listingId } });
    await this.txHost.tx.$executeRaw`
      WITH ordered AS (
        SELECT id, row_number() OVER (ORDER BY position) - 1 AS new_position
        FROM listing_photos WHERE listing_id = ${listingId}::uuid AND status = ${PhotoStatus.READY})
      UPDATE listing_photos p SET position = ordered.new_position
      FROM ordered WHERE p.id = ordered.id`;
  }

  /** Intents never confirmed within a day: their rows (the objects are removed by the caller). */
  findExpiredIntents(before: Date): Promise<PhotoUploadRecord[]> {
    return this.txHost.tx.listingPhoto.findMany({
      where: { status: PhotoStatus.PENDING, createdAt: { lt: before } },
      select: photoUploadSelect,
      orderBy: { createdAt: 'asc' },
      take: MAX_EXPIRED_PER_RUN,
    });
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length > 0) {
      await this.txHost.tx.listingPhoto.deleteMany({ where: { id: { in: ids } } });
    }
  }
}
