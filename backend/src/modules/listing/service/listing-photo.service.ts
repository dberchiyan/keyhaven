import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { ResourceNotFoundException } from '@/common/exception/api.exception';
import { JobLock } from '@/common/persistence/job-lock';
import { JobName } from '@/common/persistence/job-name';
import { Clock } from '@/common/time/clock';
import { MS_PER_DAY } from '@/common/time/units';
import { ObjectStorage } from '@/modules/storage/service/object-storage';

import { ListingRepository } from '../repository/listing.repository';
import { ListingPhotoRepository } from '../repository/listing-photo.repository';
import { ListingService } from './listing.service';
import type { ManagedListing, NewPhotoIntent, PhotoUploadIntent } from './listing.types';
import { ListingError } from './listing-errors';
import { MAX_PENDING_PHOTOS, MAX_PHOTOS, PHOTO_MAX_BYTES, PhotoStatus } from './photo-status';
import { detectImageType, PHOTO_HEAD_BYTES } from './photo-type';

const INTENT_TTL_MS = MS_PER_DAY;
const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

/** FILE-1..4: listing photos go straight to object storage; the rows here follow the object's life. */
@Injectable()
export class ListingPhotoService {
    constructor(
        private readonly listingRepository: ListingRepository,
        private readonly photoRepository: ListingPhotoRepository,
        private readonly listingService: ListingService,
        private readonly storage: ObjectStorage,
        private readonly jobLock: JobLock,
        private readonly clock: Clock,
        @InjectPinoLogger(ListingPhotoService.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * FILE-1: the row waits as PENDING while the client PUTs the bytes with the pre-signed URL (type and size signed
     * in). The key is server-generated — the filename is display metadata only — and signing is local and comes
     * first, so a signing failure leaves no orphan row.
     */
    async createPhotoIntent(listingId: string, intent: NewPhotoIntent, actorId: string): Promise<PhotoUploadIntent> {
        if (intent.sizeBytes > PHOTO_MAX_BYTES) {
            throw ListingError.photoTooLarge();
        }
        const key = `listings/${listingId}/${randomUUID()}.${EXTENSION[intent.contentType]}`;
        const upload = await this.storage.presignUpload(key, intent.contentType, intent.sizeBytes);
        const photoId = await this.reserveIntent(listingId, key, intent, actorId);
        return { photoId, uploadUrl: upload.url, headers: upload.headers, expiresAt: upload.expiresAt };
    }

    /**
     * FILE-3: the size comes from HEAD and the type from the first bytes — never the client's word — and the photo
     * becomes the last ready one. A repeat on a ready photo changes nothing; a mismatch removes the object, then the
     * intent, outside any transaction (DATA-12), and answers 422.
     */
    async confirmPhoto(listingId: string, photoId: string, actorId: string): Promise<ManagedListing> {
        const photo = await this.photoRepository.findUpload(listingId, photoId);
        if (!photo?.storageKey) {
            throw new ResourceNotFoundException();
        }
        if (photo.status === PhotoStatus.READY) {
            return this.listingService.findManaged(listingId);
        }
        const stored = await this.storage.head(photo.storageKey);
        if (!stored) {
            throw ListingError.photoNotUploaded();
        }
        const detected = await detectImageType(await this.storage.readHead(photo.storageKey, PHOTO_HEAD_BYTES));
        const isGenuine =
            detected === photo.contentType &&
            stored.sizeBytes === photo.sizeBytes &&
            stored.sizeBytes <= PHOTO_MAX_BYTES;
        if (!isGenuine) {
            await this.storage.delete(photo.storageKey);
            await this.photoRepository.deletePendingByIds([photo.id]);
            throw ListingError.photoRejected();
        }
        await this.readyPhoto(listingId, photo.id, stored.sizeBytes, actorId);
        return this.listingService.findManaged(listingId);
    }

    /** The new order must hold exactly the listing's ready photos, each once (422 otherwise). */
    async reorderPhotos(listingId: string, orderedIds: readonly string[], actorId: string): Promise<ManagedListing> {
        await this.applyOrder(listingId, orderedIds, actorId);
        return this.listingService.findManaged(listingId);
    }

    /** FILE-4: the row goes first, so the gallery is consistent; the object after the commit. */
    async removePhoto(listingId: string, photoId: string, actorId: string): Promise<void> {
        const photo = await this.photoRepository.findUpload(listingId, photoId);
        if (!photo) {
            throw new ResourceNotFoundException();
        }
        await this.deletePhotoRow(listingId, photoId, actorId);
        if (photo.storageKey) {
            await this.deleteObjectQuietly(photo.storageKey);
        }
    }

    /** FILE-4, DATA-40: intents never confirmed within a day lose their rows and objects, bounded per run. */
    @Cron(CronExpression.EVERY_HOUR)
    async deleteExpiredIntents(): Promise<void> {
        await this.jobLock.runExclusive(JobName.DELETE_EXPIRED_PHOTO_INTENTS, () => this.deleteExpiredIntentsNow());
    }

    private async deleteExpiredIntentsNow(): Promise<void> {
        const expired = await this.photoRepository.findExpiredIntents(
            new Date(this.clock.now().getTime() - INTENT_TTL_MS),
        );
        if (expired.length === 0) {
            return;
        }
        await this.photoRepository.deletePendingByIds(expired.map((photo) => photo.id));
        for (const photo of expired) {
            if (photo.storageKey) {
                await this.deleteObjectQuietly(photo.storageKey);
            }
        }
        this.logger.info({ count: expired.length }, 'Expired photo upload intents deleted');
    }

    /**
     * DATA-15: under the listing's lock, at most MAX_PHOTOS ready photos and MAX_PENDING_PHOTOS open intents —
     * without the second bound an owner could open rows and presigned slots without limit.
     */
    @Transactional()
    private async reserveIntent(
        listingId: string,
        key: string,
        intent: NewPhotoIntent,
        createdBy: string,
    ): Promise<string> {
        await this.listingRepository.lock(listingId);
        if ((await this.photoRepository.countReady(listingId)) >= MAX_PHOTOS) {
            throw ListingError.tooManyPhotos();
        }
        if ((await this.photoRepository.countPending(listingId)) >= MAX_PENDING_PHOTOS) {
            throw ListingError.tooManyPendingUploads();
        }
        return this.photoRepository.createIntent(listingId, key, intent.contentType, intent.sizeBytes, createdBy);
    }

    /** DATA-15: count and position under the listing's lock, so two confirmations at once stay in order. */
    @Transactional()
    private async readyPhoto(listingId: string, photoId: string, sizeBytes: number, actorId: string): Promise<void> {
        await this.listingRepository.lock(listingId);
        if ((await this.photoRepository.countReady(listingId)) >= MAX_PHOTOS) {
            throw ListingError.tooManyPhotos();
        }
        const position = await this.photoRepository.nextPosition(listingId);
        await this.photoRepository.markReady(photoId, position, sizeBytes, actorId);
    }

    @Transactional()
    private async applyOrder(listingId: string, orderedIds: readonly string[], actorId: string): Promise<void> {
        const ready = (await this.photoRepository.findByListing(listingId))
            .filter((photo) => photo.status === PhotoStatus.READY)
            .map((photo) => photo.id);
        const isSameSet =
            ready.length === orderedIds.length &&
            new Set(orderedIds).size === orderedIds.length &&
            orderedIds.every((id) => ready.includes(id));
        if (!isSameSet) {
            throw ListingError.photoOrderMismatch();
        }
        await this.photoRepository.reorder(listingId, orderedIds, this.clock.now(), actorId);
    }

    @Transactional()
    private async deletePhotoRow(listingId: string, photoId: string, actorId: string): Promise<void> {
        await this.photoRepository.remove(listingId, photoId, this.clock.now(), actorId);
    }

    /** The row is already gone: a leftover object is harmless, and the next cleanup may retry. */
    private async deleteObjectQuietly(key: string): Promise<void> {
        try {
            await this.storage.delete(key);
        } catch (error: unknown) {
            this.logger.warn({ err: error, key }, 'Stored photo not deleted');
        }
    }
}
