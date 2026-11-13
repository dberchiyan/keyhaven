import { useCallback, useState } from 'react';
import { isApiError } from '@/shared/api/apiError';
import type { ErrorCode } from '@/shared/types';
import { useConfirmPhoto, usePhotoIntent } from './useListingQueries';

/** Accepted by the backend's intent (listing/service/photo-status.ts). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export interface UploadProgress {
  fileName: string;
  /** 0–100 while the bytes travel; the confirm step shows at 100. */
  percent: number;
}

/**
 * One photo at a time: an intent from the API, the bytes straight to storage with the signed
 * URL (a plain PUT — the one place outside the API client, as the rules allow for object
 * storage), then the confirmation. Errors show on the manager's line.
 */
export const usePhotoUpload = (listingId: string) => {
  const intent = usePhotoIntent(listingId);
  const confirm = useConfirmPhoto(listingId);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<ErrorCode | 'PHOTO_TYPE' | 'PHOTO_SIZE' | null>(null);

  const upload = useCallback(
    async (file: File): Promise<void> => {
      setError(null);
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
        setProgress(null);
      }
    },
    [intent, confirm],
  );

  return {
    upload,
    progress,
    error,
    clearError: () => {
      setError(null);
    },
  };
};

/** XMLHttpRequest for its upload progress events; fetch has none. */
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
      // The browser sets Content-Length itself; the signed value matches the file's size.
      if (name.toLowerCase() !== 'content-length') {
        request.setRequestHeader(name, value);
      }
    }
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${request.status}`));
      }
    });
    request.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    request.send(file);
  });
