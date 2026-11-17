import { z } from 'zod';

/** API-21: a page is `{ content, totalElements }`, nothing else. */
export const pageResponseSchema = <T extends z.ZodType>(
    item: T,
): z.ZodObject<{ content: z.ZodArray<T>; totalElements: z.ZodNumber }> =>
    z.object({
        content: z.array(item),
        totalElements: z.number().int().min(0),
    });
