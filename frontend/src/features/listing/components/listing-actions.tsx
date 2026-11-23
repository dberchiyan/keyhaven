import BlockOutlined from '@mui/icons-material/BlockOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { type ReactElement, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { listingPath } from '@/shared/lib/paths';

import { useListingActions } from '../hooks/use-listing-actions';
import type { ManagedListing } from '../types';
import { ListingActionMessage } from './listing-action-message';
import { SuspendListingDialog } from './suspend-listing-dialog';

const STATUS_HINT = {
    PUBLISHED: 'managed.publishedHint',
    DRAFT: 'managed.draftHint',
    UNPUBLISHED: 'managed.unpublishedHint',
    SUSPENDED: 'managed.suspendedHint',
} as const;

export interface ListingActionsProps {
    listing: ManagedListing;
}

/** The status, what it means, and the buttons the caller's role has for it. */
export function ListingActions({ listing }: ListingActionsProps): ReactElement {
    const { t } = useTranslation(['listing', 'errors']);
    const actions = useListingActions(listing);
    const suspendButtonRef = useRef<HTMLButtonElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (actions.outcome || actions.error) {
            messageRef.current?.focus();
        }
    }, [actions.outcome, actions.error]);

    return (
        <Card variant="outlined" component="section" aria-labelledby="actions-heading">
            <CardContent className="flex flex-col gap-4 p-4">
                <Typography id="actions-heading" variant="subtitle2" component="h2" color="textSecondary">
                    {t('listing:managed.actions')}
                </Typography>
                <Typography variant="body2">
                    {listing.isDemo ? t('listing:showcase.hint') : t(`listing:${STATUS_HINT[listing.status]}`)}
                </Typography>
                {actions.ownerAction && (
                    <Button
                        variant="contained"
                        size="large"
                        disabled={listing.isDemo}
                        loading={actions.isPending}
                        onClick={() => {
                            actions.run(actions.ownerAction === 'publish' ? 'publish' : 'unpublish');
                        }}
                    >
                        {t(`listing:managed.${actions.ownerAction}`)}
                    </Button>
                )}
                {actions.canSuspend && (
                    <Button
                        ref={suspendButtonRef}
                        variant="outlined"
                        color="error"
                        size="large"
                        startIcon={<BlockOutlined aria-hidden />}
                        disabled={listing.isDemo || actions.isPending}
                        onClick={actions.openSuspend}
                    >
                        {t('listing:managed.suspend')}
                    </Button>
                )}
                {listing.status === 'PUBLISHED' && (
                    <Button component={RouterLink} to={listingPath(listing.id)} variant="text" size="small">
                        {t('listing:managed.publicView')}
                    </Button>
                )}
                {(actions.outcome || actions.error) && (
                    <ListingActionMessage
                        ref={messageRef}
                        error={actions.error}
                        transition={actions.outcome?.transition}
                        onDismiss={actions.dismissOutcome}
                    />
                )}
            </CardContent>
            <SuspendListingDialog
                open={actions.isConfirmingSuspend}
                title={listing.title}
                isPending={actions.isPending}
                onCancel={() => {
                    actions.closeSuspend();
                    suspendButtonRef.current?.focus();
                }}
                onConfirm={() => {
                    actions.run('suspend');
                }}
            />
        </Card>
    );
}
