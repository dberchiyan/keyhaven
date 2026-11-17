import BlockOutlined from '@mui/icons-material/BlockOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { listingPath, settingsPath } from '@/shared/lib/paths';
import { useListingActions } from '../hooks/useListingActions';
import type { ManagedListing } from '../types';
import { SuspendListingDialog } from './SuspendListingDialog';

const STATUS_HINT = {
    PUBLISHED: 'managed.publishedHint',
    DRAFT: 'managed.draftHint',
    UNPUBLISHED: 'managed.unpublishedHint',
    SUSPENDED: 'managed.suspendedHint',
} as const;

const OUTCOME_TEXT = {
    publish: 'managed.done.published',
    unpublish: 'managed.done.unpublished',
    suspend: 'managed.done.suspended',
} as const;

export interface ListingActionsProps {
    listing: ManagedListing;
}

/** The status, what it means, and the buttons the caller's role has for it. */
export function ListingActions({ listing }: ListingActionsProps) {
    const { t } = useTranslation(['listing', 'errors']);
    const actions = useListingActions(listing);
    const suspendButtonRef = useRef<HTMLButtonElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);

    // The result (or an error) is actionable feedback: it takes focus once it appears.
    useEffect(() => {
        if (actions.outcome || actions.error) {
            messageRef.current?.focus();
        }
    }, [actions.outcome, actions.error]);

    return (
        <Card variant="outlined" component="section" aria-labelledby="actions-heading">
            <CardContent className="flex flex-col gap-3 p-4">
                <Typography id="actions-heading" variant="subtitle2" component="h2" color="textSecondary">
                    {t('listing:managed.actions')}
                </Typography>
                <Typography variant="body2">
                    {listing.demo ? t('listing:showcase.hint') : t(`listing:${STATUS_HINT[listing.status]}`)}
                </Typography>
                {actions.ownerAction && (
                    <Button
                        variant="contained"
                        size="large"
                        disabled={listing.demo}
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
                        disabled={listing.demo || actions.isPending}
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
                    <Alert
                        ref={messageRef}
                        tabIndex={-1}
                        severity={actions.error ? 'error' : 'success'}
                        role={actions.error ? 'alert' : 'status'}
                        className="outline-none"
                        onClose={actions.error ? undefined : actions.dismissOutcome}
                    >
                        {actions.error ? (
                            actions.error.code === 'EMAIL_NOT_VERIFIED' ? (
                                <>
                                    {t('listing:managed.verifyToPublish')}{' '}
                                    <Link component={RouterLink} to={settingsPath('account')}>
                                        {t('listing:managed.verifyLink')}
                                    </Link>
                                </>
                            ) : (
                                t(`errors:${actions.error.code}`)
                            )
                        ) : actions.outcome ? (
                            t(`listing:${OUTCOME_TEXT[actions.outcome.transition]}`)
                        ) : null}
                    </Alert>
                )}
            </CardContent>
            <SuspendListingDialog
                open={actions.confirmingSuspend}
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
