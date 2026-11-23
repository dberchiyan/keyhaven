import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { LOGIN_FIELD_LIMITS } from '../schemas';

const urlSchema = z.object({ email: z.email().max(LOGIN_FIELD_LIMITS.email).optional().catch(undefined) });

/**
 * A link may name the account to sign in as (`?email=`, the landing's demo cards): the form starts with it filled in.
 * Only the address travels in the URL, never a password (FSEC-4); a malformed value is ignored.
 */
export const useLoginParams = (): { email: string | undefined } => {
    const [searchParams] = useSearchParams();
    const { email } = urlSchema.parse({ email: searchParams.get('email') ?? undefined });
    return { email };
};
