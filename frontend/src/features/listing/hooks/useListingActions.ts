import { useState } from 'react';
import { useAccess } from '@/features/auth';
import type { ApiError } from '@/shared/api/apiError';
import { usePublishListing, useSuspendListing, useUnpublishListing } from './useListingQueries';
import type { ListingTransition, ManagedListing } from '../types';

/** What happened last, for the confirmation line; cleared by Dismiss. */
export interface ListingActionOutcome {
    transition: ListingTransition;
}

/** The owner's publish / unpublish and the admin's suspend for one listing, with their state. */
export const useListingActions = (listing: ManagedListing) => {
    const can = useAccess();
    const publish = usePublishListing(listing.id);
    const unpublish = useUnpublishListing(listing.id);
    const suspend = useSuspendListing(listing.id);
    const [confirmingSuspend, setConfirmingSuspend] = useState(false);
    const [outcome, setOutcome] = useState<ListingActionOutcome | null>(null);

    const run = (transition: ListingTransition): void => {
        const mutation = transition === 'publish' ? publish : transition === 'unpublish' ? unpublish : suspend;
        setOutcome(null);
        mutation.mutate(undefined, {
            onSuccess: () => {
                setOutcome({ transition });
                setConfirmingSuspend(false);
            },
        });
    };

    const canPublish = can('listing.publish');
    const error: ApiError | null = publish.error ?? unpublish.error ?? suspend.error;
    return {
        /** Which owner action applies to the current status, if any. */
        ownerAction: !canPublish
            ? null
            : listing.status === 'PUBLISHED'
              ? ('unpublish' as const)
              : listing.status === 'SUSPENDED'
                ? null
                : ('publish' as const),
        canSuspend: can('listing.suspend') && listing.status !== 'SUSPENDED',
        isPending: publish.isPending || unpublish.isPending || suspend.isPending,
        error,
        outcome,
        dismissOutcome: () => {
            setOutcome(null);
        },
        run,
        confirmingSuspend,
        openSuspend: () => {
            setConfirmingSuspend(true);
        },
        closeSuspend: () => {
            setConfirmingSuspend(false);
        },
    };
};
