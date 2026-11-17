/** Mirrored by ck_listing_photos_status. */
export const PhotoStatus = {
    /** An upload intent: the client was given a URL, the object may or may not be there yet. */
    PENDING: 'PENDING',
    /** Checked and shown. */
    READY: 'READY',
} as const;
export type PhotoStatus = (typeof PhotoStatus)[keyof typeof PhotoStatus];
export const PHOTO_STATUSES = Object.values(PhotoStatus) as [PhotoStatus, ...PhotoStatus[]];
export const isPhotoStatus = (value: string): value is PhotoStatus =>
    (PHOTO_STATUSES as readonly string[]).includes(value);

/** Photo uploads: what is accepted (platform.md → one path for every size, an allowlist per use). */
export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];
export const isPhotoContentType = (value: string): value is PhotoContentType =>
    (PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
/** The gallery is bounded: a listing holds at most this many ready photos. */
export const MAX_PHOTOS = 20;
/**
 * Upload intents a listing may hold besides its ready photos: enough for a whole gallery in
 * flight, and a ceiling on the rows and presigned slots one owner can open (abandoned intents
 * are removed by the hourly cleanup, so the slots come back).
 */
export const MAX_PENDING_PHOTOS = 20;
/** 10 MB is plenty for a photo; the hard ceiling of the platform is 30 MB. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
