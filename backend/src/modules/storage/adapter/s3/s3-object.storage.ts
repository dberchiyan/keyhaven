import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    NotFound,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { AppConfigService } from '@/common/config/app-config.service';
import { UpstreamUnavailableException } from '@/common/exception/api.exception';
import { Clock } from '@/common/time/clock';
import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '@/common/time/units';
import { ObjectStorage, type PresignedUpload, type StoredObject } from '@/modules/storage/service/object-storage';

const UPLOAD_URL_TTL_MINUTES = 15;
const UPLOAD_URL_TTL_SECONDS = UPLOAD_URL_TTL_MINUTES * SECONDS_PER_MINUTE;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Any S3-compatible store: Cloudflare R2 in production, RustFS locally (R2_* variables). Upload URLs are signed with
 * the address browsers reach, reads and deletes go to the one the backend reaches (the same, unless configured).
 * RustFS and R2 address the bucket in the path, not as a sub-domain. CORE-35: every call has a timeout.
 */
@Injectable()
export class S3ObjectStorage extends ObjectStorage {
    private readonly client: S3Client;
    private readonly internalClient: S3Client;
    private readonly bucket: string;
    private readonly publicBase: string;

    constructor(
        config: AppConfigService,
        private readonly clock: Clock,
        @InjectPinoLogger(S3ObjectStorage.name) private readonly logger: PinoLogger,
    ) {
        super();
        const clientFor = (endpoint: string): S3Client =>
            new S3Client({
                endpoint,
                region: config.get('R2_REGION'),
                credentials: {
                    accessKeyId: config.get('R2_ACCESS_KEY'),
                    secretAccessKey: config.get('R2_SECRET_KEY'),
                },
                forcePathStyle: true,
                requestHandler: { requestTimeout: REQUEST_TIMEOUT_MS },
            });
        this.client = clientFor(config.get('R2_ENDPOINT'));
        const internal = config.get('R2_INTERNAL_ENDPOINT');
        this.internalClient = internal ? clientFor(internal) : this.client;
        this.bucket = config.get('R2_BUCKET');
        this.publicBase = config.get('R2_PUBLIC_URL');
    }

    /** FILE-1: type and length are signed in, so the store refuses a PUT that differs from the intent; 15 minutes. */
    async presignUpload(key: string, contentType: string, sizeBytes: number): Promise<PresignedUpload> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: sizeBytes,
        });
        try {
            const url = await getSignedUrl(this.client, command, {
                expiresIn: UPLOAD_URL_TTL_SECONDS,
                signableHeaders: new Set(['content-type', 'content-length']),
            });
            return {
                url,
                expiresAt: new Date(this.clock.now().getTime() + UPLOAD_URL_TTL_SECONDS * MS_PER_SECOND),
                headers: { 'Content-Type': contentType, 'Content-Length': String(sizeBytes) },
            };
        } catch (error: unknown) {
            throw this.unavailable('presign', key, error);
        }
    }

    async head(key: string): Promise<StoredObject | undefined> {
        try {
            const result = await this.internalClient.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType };
        } catch (error: unknown) {
            if (error instanceof NotFound || isStatus(error, HttpStatus.NOT_FOUND)) {
                return undefined;
            }
            throw this.unavailable('head', key, error);
        }
    }

    async readHead(key: string, bytes: number): Promise<Uint8Array> {
        try {
            const result = await this.internalClient.send(
                new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
            );
            return result.Body ? await result.Body.transformToByteArray() : new Uint8Array();
        } catch (error: unknown) {
            throw this.unavailable('read', key, error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.internalClient.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        } catch (error: unknown) {
            throw this.unavailable('delete', key, error);
        }
    }

    publicUrl(key: string): string {
        return `${this.publicBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
    }

    /** INT-1: provider error text stays in the log; the caller gets our exception. */
    private unavailable(operation: string, key: string, error: unknown): UpstreamUnavailableException {
        this.logger.warn({ err: error, operation, key }, 'Object storage call failed');
        return new UpstreamUnavailableException();
    }
}

const isStatus = (error: unknown, status: number): boolean =>
    error instanceof S3ServiceException && error.$metadata.httpStatusCode === status;
