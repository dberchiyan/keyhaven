import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { lastApiActivity } from '@/shared/api/activity';
import { PATHS } from '@/shared/lib/paths';
import { MINUTE_MS, MS_PER_SECOND } from '@/shared/lib/units';

import { useClearSessionCache, useCurrentUser, useLogout, useRefreshCurrentUser } from './use-auth-queries';
import type { LoginLocationState } from './use-login-redirect';

const WARNING_MS = 2 * MINUTE_MS;
const SAFETY_MS = MINUTE_MS;
const TICK_MS = MS_PER_SECOND;

export interface IdleSession {
    isWarning: boolean;
    remainingMs: number;
    isStaying: boolean;
    isSigningOut: boolean;
    stay: () => void;
    signOut: () => void;
}

/**
 * The idle countdown (NAV-3): the server records activity at most once a minute, so it runs a minute short to be
 * safe; when time is up the session is gone server-side too, so the cache is cleared and the app goes to sign-in
 * saying why, keeping the page to come back to.
 */
export const useIdleSession = (): IdleSession => {
    const idleMinutes = useCurrentUser().data?.idleTimeoutMinutes;
    const refreshCurrentUser = useRefreshCurrentUser();
    const clearSessionCache = useClearSessionCache();
    const logout = useLogout();
    const navigate = useNavigate();
    const location = useLocation();
    const [now, setNow] = useState(() => Date.now());
    const [isStaying, setIsStaying] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, TICK_MS);
        return () => {
            clearInterval(timer);
        };
    }, []);

    const remainingMs =
        idleMinutes === undefined ? Infinity : lastApiActivity() + idleMinutes * MINUTE_MS - SAFETY_MS - now;

    useEffect(() => {
        if (remainingMs > 0) {
            return;
        }
        clearSessionCache();
        const state: LoginLocationState = {
            from: `${location.pathname}${location.search}${location.hash}`,
            reason: 'sessionExpired',
        };
        void navigate(PATHS.login, { replace: true, state });
    }, [remainingMs, clearSessionCache, navigate, location]);

    const stay = async (): Promise<void> => {
        setIsStaying(true);
        try {
            await refreshCurrentUser();
        } finally {
            setIsStaying(false);
            setNow(Date.now());
        }
    };

    return {
        isWarning: remainingMs > 0 && remainingMs <= WARNING_MS,
        remainingMs,
        isStaying,
        isSigningOut: logout.isPending,
        stay: () => void stay(),
        signOut: () => {
            logout.mutate();
        },
    };
};
