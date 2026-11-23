import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UPLOAD_URL_MAX_LENGTH = 2048;
const HEADER_NAME_MAX_LENGTH = 64;
const HEADER_VALUE_MAX_LENGTH = 255;

export const PhotoIntentResponseSchema = z.object({
    photoId: z.uuid(),
    uploadUrl: z.string().max(UPLOAD_URL_MAX_LENGTH),
    headers: z.record(z.string().max(HEADER_NAME_MAX_LENGTH), z.string().max(HEADER_VALUE_MAX_LENGTH)),
    expiresAt: z.iso.datetime(),
});

export class PhotoIntentResponse extends createZodDto(PhotoIntentResponseSchema) {}
