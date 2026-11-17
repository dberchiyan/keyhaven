import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const VIEWING_MESSAGE_MAX = 500;
export const VIEWING_NOTE_MAX = 300;

export const RequestViewingRequestSchema = z.object({
    listingId: z.uuid({ error: 'validation.viewing.listingId.invalid' }),
    startsAt: z.iso.datetime({ error: 'validation.viewing.startsAt.invalid' }),
    message: z.string().trim().max(VIEWING_MESSAGE_MAX, 'validation.viewing.message.tooLong').optional(),
});
export class RequestViewingRequest extends createZodDto(RequestViewingRequestSchema) {}

export const ViewingNoteRequestSchema = z.object({
    note: z.string().trim().max(VIEWING_NOTE_MAX, 'validation.viewing.note.tooLong').optional(),
});
export class ViewingNoteRequest extends createZodDto(ViewingNoteRequestSchema) {}
