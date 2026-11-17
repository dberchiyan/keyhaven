import { fileTypeFromBuffer } from 'file-type';

import { PHOTO_CONTENT_TYPES, type PhotoContentType } from './photo-status';

export const PHOTO_HEAD_BYTES = 4_100;

/**
 * FILE-3: the type comes from the stored bytes (magic numbers via `file-type`), never the client's Content-Type;
 * anything outside the allow-list is undefined. PHOTO_HEAD_BYTES is the sample `file-type` needs at most.
 */
export const detectImageType = async (head: Uint8Array): Promise<PhotoContentType | undefined> => {
    const detected = await fileTypeFromBuffer(head);
    return PHOTO_CONTENT_TYPES.find((contentType) => contentType === detected?.mime);
};
