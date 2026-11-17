import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import FavoriteOutlined from '@mui/icons-material/FavoriteOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { type LoginLocationState, useAccess, useCurrentUser } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { PATHS } from '@/shared/lib/paths';

import { useToggleSaved } from '../hooks/use-listing-mutations';

export interface SaveButtonProps {
    listingId: string;
    saved: boolean;
    title: string;
    className?: string;
}

/**
 * The heart: tenants save; a visitor without an account is taken to sign in and comes back
 * here; people who list homes have no heart. The accessible name says what pressing it does.
 */
export function SaveButton({ listingId, saved, title, className }: SaveButtonProps): ReactElement | null {
    const { t } = useTranslation('listing');
    const can = useAccess();
    const { data: user } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const toggle = useToggleSaved();
    if (user && !can('listing.save')) {
        return null;
    }
    const label = saved ? t('save.remove', { title }) : t('save.add', { title });
    const signIn = (): void => {
        const state: LoginLocationState = {
            from: `${location.pathname}${location.search}${location.hash}`,
        };
        void navigate(PATHS.login, { state });
    };
    return (
        <Tooltip title={user ? (saved ? t('save.saved') : t('save.save')) : t('save.signIn')}>
            <IconButton
                aria-label={user ? label : t('save.signInTo', { title })}
                aria-pressed={saved}
                disabled={toggle.isPending}
                onClick={() => {
                    if (!user) {
                        signIn();
                        return;
                    }
                    toggle.mutate({ listingId, saved });
                }}
                className={cn('bg-background-paper/90 text-text-primary hover:bg-background-paper', className)}
            >
                {saved ? (
                    <FavoriteOutlined aria-hidden className="text-error" />
                ) : (
                    <FavoriteBorderOutlined aria-hidden />
                )}
            </IconButton>
        </Tooltip>
    );
}
