import type { SecurityCategory } from '../types';

/** The caller comes from the session; the cache is cleared on sign-out and sign-up. */
export const authKeys = {
    all: ['auth'] as const,
    me: () => [...authKeys.all, 'me'] as const,
    sessions: () => [...authKeys.all, 'sessions'] as const,
    sessionsPage: (page: number) => [...authKeys.sessions(), page] as const,
    securityLog: (category: SecurityCategory | undefined, page: number) =>
        [...authKeys.all, 'security-log', category ?? 'ALL', page] as const,
};
