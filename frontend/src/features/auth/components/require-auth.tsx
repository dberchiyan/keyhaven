import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { ErrorState } from '@/shared/components/error-state';
import { PageLoader } from '@/shared/components/page-loader';
import { PATHS } from '@/shared/lib/paths';

import { useCurrentUser } from '../hooks/use-current-user';
import type { LoginLocationState } from '../hooks/use-login-redirect';

/** App start (NAV-2, NAV-3): `/auth/me` 200 opens the app, signed out goes to sign-in keeping the intended path. */
export function RequireAuth(): ReactElement {
    const location = useLocation();
    const { data: user, isPending, isError, error, refetch } = useCurrentUser();

    if (isPending) {
        return <PageLoader />;
    }
    if (isError) {
        return (
            <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
                <ErrorState error={error} onRetry={() => void refetch()} />
            </div>
        );
    }
    if (!user) {
        const state: LoginLocationState = {
            from: `${location.pathname}${location.search}${location.hash}`,
        };
        return <Navigate to={PATHS.login} replace state={state} />;
    }
    return <Outlet />;
}
