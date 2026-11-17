import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './pageable';

const CURSOR_MAX_LENGTH = 128;
const CURSOR_SEPARATOR = '|';

export interface Cursor {
    occurredAt: Date;
    id: string;
}

const cursorPartsSchema = z.tuple([z.iso.datetime(), z.uuid()]);

export const encodeCursor = (cursor: Cursor): string =>
    Buffer.from(`${cursor.occurredAt.toISOString()}${CURSOR_SEPARATOR}${cursor.id}`).toString('base64url');

/** An opaque cursor that does not decode to an instant and an id is a validation failure, never a fresh start. */
const decodeCursor = (value: string, context: z.RefinementCtx): Cursor | typeof z.NEVER => {
    const parsed = cursorPartsSchema.safeParse(
        Buffer.from(value, 'base64url').toString('utf8').split(CURSOR_SEPARATOR),
    );
    if (!parsed.success) {
        context.addIssue({ code: 'custom', message: 'validation.cursor.invalid' });
        return z.NEVER;
    }
    return { occurredAt: new Date(parsed.data[0]), id: parsed.data[1] };
};

export const cursorQueryShape = {
    after: z.string().max(CURSOR_MAX_LENGTH).transform(decodeCursor).optional(),
    size: z.coerce.number({ error: 'validation.invalid' }).int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

/** API-23: a list that grows without bound pages by cursor — `{ content, nextCursor }`, newest first, no count. */
export const cursorPageSchema = <T extends z.ZodType>(
    item: T,
): z.ZodObject<{ content: z.ZodArray<T>; nextCursor: z.ZodNullable<z.ZodString> }> =>
    z.object({
        content: z.array(item).max(MAX_PAGE_SIZE),
        nextCursor: z.string().max(CURSOR_MAX_LENGTH).nullable(),
    });

export interface CursorPage<T> {
    content: T[];
    nextCursor: Cursor | undefined;
}

/** Reads `size + 1` rows: the extra one only says whether another page exists. */
export const toCursorPage = <T extends Cursor>(rows: T[], size: number): CursorPage<T> => {
    const content = rows.slice(0, size);
    const last = content.at(-1);
    return {
        content,
        nextCursor: rows.length > size && last ? { occurredAt: last.occurredAt, id: last.id } : undefined,
    };
};
