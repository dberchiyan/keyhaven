import { z } from 'zod';

import { PERSON_NAME_MAX_LENGTH } from './limits';

/** One schema for every place a name is typed (sign-up, renaming oneself), so the rules never drift apart. */
export const personName = (field: 'firstName' | 'lastName'): z.ZodString =>
    z
        .string({ error: `validation.${field}.required` })
        .trim()
        .min(1, `validation.${field}.required`)
        .max(PERSON_NAME_MAX_LENGTH, `validation.${field}.tooLong`);
