import { z } from 'zod';

/** Mirrors backend CreateSavedSearchRequestSchema (saved-search/controller/dto/saved-search.request.ts). */
export const SAVED_SEARCH_LIMITS = { name: 80 } as const;

export const saveSearchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'validation:savedSearchName.required')
    .max(SAVED_SEARCH_LIMITS.name, 'validation:savedSearchName.tooLong'),
  emailAlerts: z.boolean(),
});

export type SaveSearchValues = z.input<typeof saveSearchSchema>;
export type SaveSearchOutput = z.output<typeof saveSearchSchema>;

const MESSAGE_SET: ReadonlySet<string> = new Set([
  'validation:savedSearchName.required',
  'validation:savedSearchName.tooLong',
]);
export const isSaveSearchValidationMessage = (
  message: string,
): message is 'validation:savedSearchName.required' => MESSAGE_SET.has(message);
