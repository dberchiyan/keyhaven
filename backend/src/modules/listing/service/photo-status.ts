export const PhotoStatus = {
    PENDING: 'PENDING',
    READY: 'READY',
} as const;
export type PhotoStatus = (typeof PhotoStatus)[keyof typeof PhotoStatus];
export const PHOTO_STATUSES = Object.values(PhotoStatus) as [PhotoStatus, ...PhotoStatus[]];

/** A PENDING row is an upload intent the client may not have finished; ck_listing_photos_status allows no other value. */
export const isPhotoStatus = (value: string): value is PhotoStatus =>
    (PHOTO_STATUSES as readonly string[]).includes(value);

export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];

/** FILE-1: an allow-list per use; photos are the only upload, so these three types are all there is. */
export const isPhotoContentType = (value: string): value is PhotoContentType =>
    (PHOTO_CONTENT_TYPES as readonly string[]).includes(value);

/** DATA-8: the gallery is bounded, so every photo query and the reorder stay small. */
export const MAX_PHOTOS = 20;
/** DATA-8: a whole gallery may be in flight, never more open rows and presigned slots per listing. */
export const MAX_PENDING_PHOTOS = 20;

const BYTES_PER_KIB = 1024;
export const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;
export const PHOTO_MAX_MIB = 10;
export const PHOTO_MAX_BYTES = PHOTO_MAX_MIB * BYTES_PER_MIB;
