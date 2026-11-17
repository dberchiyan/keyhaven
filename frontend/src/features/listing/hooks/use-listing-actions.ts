import { useState } from 'react';

import { useAccess } from '@/features/auth';
import type { ApiError } from '@/shared/api/api-error';

import type { ListingTransition, ManagedListing } from '../types';
import { usePublishListing, useSuspendListing, useUnpublishListing } from './use-listing-mutations';

export interface ListingActionOutcome {
    transition: ListingTransition;
}

export type OwnerAction = 'publish' | 'unpublish';

export interface UseListingActionsResult {
    ownerAction: OwnerAction | undefined;
    canSuspend: boolean;
    isPending: boolean;
    error: ApiError | null;
    outcome: ListingActionOutcome | undefined;
    dismissOutcome: () => void;
    run: (transition: ListingTransition) => void;
    isConfirmingSuspend: boolean;
    openSuspend: () => void;
    closeSuspend: () => void;
}

const ownerActionFor = (listing: ManagedListing, canPublish: boolean): OwnerAction | undefined => {
    if (!canPublish || listing.status === 'SUSPENDED') {
        return undefined;
    }
    return listing.status === 'PUBLISHED' ? 'unpublish' : 'publish';
};

/**
 * The owner's publish / unpublish and the admin's suspend for one listing, with their state: only
 * an admin lifts a suspension, so a suspended listing offers its owner no action.
 */
export const useListingActions = (listing: ManagedListing): UseListingActionsResult => {
    const can = useAccess();
    const publish = usePublishListing(listing.id);
    const unpublish = useUnpublishListing(listing.id);
    const suspend = useSuspendListing(listing.id);
    const [isConfirmingSuspend, setConfirmingSuspend] = useState(false);
    const [outcome, setOutcome] = useState<ListingActionOutcome | undefined>(undefined);

    const run = (transition: ListingTransition): void => {
        const mutation = transition === 'publish' ? publish : transition === 'unpublish' ? unpublish : suspend;
        setOutcome(undefined);
        mutation.mutate(undefined, {
            onSuccess: () => {
                setOutcome({ transition });
                setConfirmingSuspend(false);
            },
        });
    };

    const error = publish.error ?? unpublish.error ?? suspend.error;
    return {
        ownerAction: ownerActionFor(listing, can('listing.publish')),
        canSuspend: can('listing.suspend') && listing.status !== 'SUSPENDED',
        isPending: publish.isPending || unpublish.isPending || suspend.isPending,
        error,
        outcome,
        dismissOutcome: () => {
            setOutcome(undefined);
        },
        run,
        isConfirmingSuspend,
        openSuspend: () => {
            setConfirmingSuspend(true);
        },
        closeSuspend: () => {
            setConfirmingSuspend(false);
        },
    };
};
