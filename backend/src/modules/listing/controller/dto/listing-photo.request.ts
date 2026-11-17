import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MAX_PHOTOS, PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from '../../service/photo-status';

/** `POST …/photo-intents`: what the client is about to upload. */
export const PhotoIntentRequestSchema = z.object({
    /** Display metadata only; the stored key is server-generated. */
    filename: z
        .string({ error: 'validation.photo.filenameRequired' })
        .trim()
        .min(1, 'validation.photo.filenameRequired')
        .max(255, 'validation.photo.filenameTooLong'),
    contentType: z.enum(PHOTO_CONTENT_TYPES, { error: 'validation.photo.typeRejected' }),
    sizeBytes: z
        .number({ error: 'validation.photo.sizeInvalid' })
        .int('validation.photo.sizeInvalid')
        .min(1, 'validation.photo.sizeInvalid')
        .max(PHOTO_MAX_BYTES, 'validation.photo.tooLarge'),
});

export class PhotoIntentRequest extends createZodDto(PhotoIntentRequestSchema) {}

/** The intent's answer: where to PUT, with which headers, until when. */
export const PhotoIntentResponseSchema = z.object({
    photoId: z.uuid(),
    uploadUrl: z.string().max(2048),
    headers: z.record(z.string().max(64), z.string().max(255)),
    expiresAt: z.iso.datetime(),
});

export class PhotoIntentResponse extends createZodDto(PhotoIntentResponseSchema) {}

/** `PUT …/photos`: the complete new order of the listing's ready photos. */
export const ReorderPhotosRequestSchema = z.object({
    photoIds: z
        .array(z.uuid({ error: 'validation.invalid' }))
        .min(1, 'validation.invalid')
        .max(MAX_PHOTOS, 'validation.invalid'),
});

export class ReorderPhotosRequest extends createZodDto(ReorderPhotosRequestSchema) {}
