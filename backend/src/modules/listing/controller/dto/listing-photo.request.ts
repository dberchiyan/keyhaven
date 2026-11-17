import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { MAX_PHOTOS, PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from '@/modules/listing/service/photo-status';

const FILENAME_MAX_LENGTH = 255;
const UPLOAD_URL_MAX_LENGTH = 2048;
const HEADER_NAME_MAX_LENGTH = 64;
const HEADER_VALUE_MAX_LENGTH = 255;

export const PhotoIntentRequestSchema = z.object({
    filename: z
        .string({ error: 'validation.photo.filenameRequired' })
        .trim()
        .min(1, 'validation.photo.filenameRequired')
        .max(FILENAME_MAX_LENGTH, 'validation.photo.filenameTooLong'),
    contentType: z.enum(PHOTO_CONTENT_TYPES, { error: 'validation.photo.typeRejected' }),
    sizeBytes: z
        .number({ error: 'validation.photo.sizeInvalid' })
        .int('validation.photo.sizeInvalid')
        .min(1, 'validation.photo.sizeInvalid')
        .max(PHOTO_MAX_BYTES, 'validation.photo.tooLarge'),
});

export class PhotoIntentRequest extends createZodDto(PhotoIntentRequestSchema) {}

export const PhotoIntentResponseSchema = z.object({
    photoId: z.uuid(),
    uploadUrl: z.string().max(UPLOAD_URL_MAX_LENGTH),
    headers: z.record(z.string().max(HEADER_NAME_MAX_LENGTH), z.string().max(HEADER_VALUE_MAX_LENGTH)),
    expiresAt: z.iso.datetime(),
});

export class PhotoIntentResponse extends createZodDto(PhotoIntentResponseSchema) {}

export const ReorderPhotosRequestSchema = z.object({
    photoIds: z
        .array(z.uuid({ error: 'validation.invalid' }))
        .min(1, 'validation.invalid')
        .max(MAX_PHOTOS, 'validation.invalid'),
});

export class ReorderPhotosRequest extends createZodDto(ReorderPhotosRequestSchema) {}
