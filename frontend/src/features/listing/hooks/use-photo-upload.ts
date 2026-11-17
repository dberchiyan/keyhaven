import { useCallback, useState } from 'react';

import { isApiError } from '@/shared/api/api-error';
import { HTTP_STATUS } from '@/shared/api/http-status';
import { MIB_BYTES, PERCENT } from '@/shared/lib/units';
import type { ErrorCode } from '@/shared/types';

import { useConfirmPhoto, usePhotoIntent } from './use-listing-mutations';

const PHOTO_MAX_MIB = 10;

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_MAX_BYTES = PHOTO_MAX_MIB * MIB_BYTES;

export interface UploadProgress {
    fileName: string;
    percent: number;
}

export type PhotoUploadError = ErrorCode | 'PHOTO_TYPE' | 'PHOTO_SIZE';

export interface UsePhotoUploadResult {
    upload: (file: File) => Promise<void>;
    progress: UploadProgress | undefined;
    error: PhotoUploadError | undefined;
    clearError: () => void;
}

/**
 * XMLHttpRequest for its upload progress events (fetch has none). Content-Length is left to the
 * browser: the signed value already matches the file's size, and browsers refuse to set it.
 */
const putFile = (
    url: string,
    headers: Record<string, string>,
    file: File,
    onProgress: (percent: number) => void,
): Promise<void> =>
    new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('PUT', url);
        for (const [name, value] of Object.entries(headers)) {
            if (name.toLowerCase() !== 'content-length') {
                request.setRequestHeader(name, value);
            }
        }
        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * PERCENT));
            }
        });
        request.addEventListener('load', () => {
            if (request.status >= HTTP_STATUS.OK && request.status < HTTP_STATUS.MULTIPLE_CHOICES) {
                resolve();
                return;
            }
            reject(new Error(`Upload failed with status ${request.status}`));
        });
        request.addEventListener('error', () => {
            reject(new Error('Upload failed'));
        });
        request.send(file);
    });

/**
 * One photo at a time: an intent from the API, the bytes straight to storage with the signed URL
 * (a plain PUT — the pre-signed upload is the one call allowed outside the API client, ARCH-10),
 * then the confirmation. One Idempotency-Key per chosen file (QRY-12). Type and size are checked
 * first against the same limits as the backend's intent (listing/service/photo-status.ts).
 */
export const usePhotoUpload = (listingId: string): UsePhotoUploadResult => {
    const intent = usePhotoIntent(listingId);
    const confirm = useConfirmPhoto(listingId);
    const [progress, setProgress] = useState<UploadProgress | undefined>(undefined);
    const [error, setError] = useState<PhotoUploadError | undefined>(undefined);

    const upload = useCallback(
        async (file: File): Promise<void> => {
            setError(undefined);
            const contentType = PHOTO_TYPES.find((candidate) => candidate === file.type);
            if (!contentType) {
                setError('PHOTO_TYPE');
                return;
            }
            if (file.size > PHOTO_MAX_BYTES) {
                setError('PHOTO_SIZE');
                return;
            }
            setProgress({ fileName: file.name, percent: 0 });
            try {
                const ticket = await intent.mutateAsync({
                    request: { filename: file.name, contentType, sizeBytes: file.size },
                    key: crypto.randomUUID(),
                });
                await putFile(ticket.uploadUrl, ticket.headers, file, (percent) => {
                    setProgress({ fileName: file.name, percent });
                });
                await confirm.mutateAsync(ticket.photoId);
            } catch (caught) {
                setError(isApiError(caught) ? caught.code : 'UPSTREAM_UNAVAILABLE');
            } finally {
                setProgress(undefined);
            }
        },
        [intent, confirm],
    );

    return {
        upload,
        progress,
        error,
        clearError: () => {
            setError(undefined);
        },
    };
};
