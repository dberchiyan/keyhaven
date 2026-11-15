import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const VIEWING_MESSAGE_MAX = 500;
export const VIEWING_NOTE_MAX = 300;

/** A tenant's request: the home, one of its offered slots (an ISO instant), an optional note. */
export const RequestViewingRequestSchema = z.object({
  listingId: z.uuid({ error: 'validation.viewing.listingId.invalid' }),
  startsAt: z.iso.datetime({ error: 'validation.viewing.startsAt.invalid' }),
  message: z
    .string()
    .trim()
    .max(VIEWING_MESSAGE_MAX, 'validation.viewing.message.tooLong')
    .optional(),
});
export class RequestViewingRequest extends createZodDto(RequestViewingRequestSchema) {}

/** The note that goes with a decline or a cancellation (the other side reads it). */
export const ViewingNoteRequestSchema = z.object({
  note: z.string().trim().max(VIEWING_NOTE_MAX, 'validation.viewing.note.tooLong').optional(),
});
export class ViewingNoteRequest extends createZodDto(ViewingNoteRequestSchema) {}
