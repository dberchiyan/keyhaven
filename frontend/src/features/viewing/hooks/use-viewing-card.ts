import type { UseMutationResult } from '@tanstack/react-query';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';

import { type DisplayStatus, displayStatus, formatSlot, isUpcoming } from '../format';
import type { Viewing, ViewingDecision } from '../types';
import { type DecideViewingVariables, useDecideViewing } from './use-viewing-queries';

export type ViewingAudience = 'tenant' | 'owner';
export type DecisionDialogKind = Exclude<ViewingDecision, 'confirm'>;

export interface UseViewingCardResult {
    decide: UseMutationResult<Viewing, ApiError, DecideViewingVariables>;
    dialog: DecisionDialogKind | undefined;
    setDialog: (kind: DecisionDialogKind | undefined) => void;
    run: (decision: ViewingDecision, note?: string) => void;
    status: DisplayStatus;
    upcoming: boolean;
    ownerActs: boolean;
    tenantActs: boolean;
    canMessage: boolean;
    address: string | undefined;
    subject: string;
    triggerRef: RefObject<HTMLButtonElement | null>;
    errorRef: RefObject<HTMLDivElement | null>;
}

type CardFacts = Pick<
    UseViewingCardResult,
    'status' | 'upcoming' | 'ownerActs' | 'tenantActs' | 'canMessage' | 'address' | 'subject'
>;

const cardFacts = (
    viewing: Viewing,
    audience: ViewingAudience,
    canDecide: boolean,
    now: number,
    locale: string,
): CardFacts => {
    const upcoming = isUpcoming(viewing, now);
    const { address } = viewing.listing;
    return {
        status: displayStatus(viewing, now),
        upcoming,
        ownerActs: audience === 'owner' && canDecide && upcoming,
        tenantActs: audience === 'tenant' && upcoming,
        canMessage: viewing.status === 'CONFIRMED' && (audience === 'tenant' || canDecide),
        address:
            audience === 'tenant' && address ? [address.line1, address.line2].filter(Boolean).join(', ') : undefined,
        subject: `${viewing.listing.title} — ${formatSlot(viewing.startsAt, viewing.listing.city.timeZone, locale)}`,
    };
};

/**
 * What a viewing row may do for this role (ARCH-31). "Now" is taken once per mount, so a row does
 * not flip to "took place" while it is read; the conversation opens with the confirmation and
 * outlives the visit; the address shows to the tenant only once the API reveals it. A failed
 * decision focuses its error (A11Y-3).
 */
export const useViewingCard = (
    viewing: Viewing,
    audience: ViewingAudience,
    canDecide: boolean,
    onChanged: (() => void) | undefined,
): UseViewingCardResult => {
    const { i18n } = useTranslation();
    const decide = useDecideViewing();
    const [dialog, setDialog] = useState<DecisionDialogKind | undefined>(undefined);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const errorRef = useRef<HTMLDivElement>(null);
    const [now] = useState(() => Date.now());

    useEffect(() => {
        if (decide.isError) {
            errorRef.current?.focus();
        }
    }, [decide.isError]);

    const run = (decision: ViewingDecision, note?: string): void => {
        decide.mutate(
            { id: viewing.id, decision, ...(note ? { note } : {}) },
            {
                onSuccess: () => {
                    setDialog(undefined);
                    onChanged?.();
                },
            },
        );
    };

    return {
        decide,
        dialog,
        setDialog,
        run,
        ...cardFacts(viewing, audience, canDecide, now, i18n.language),
        triggerRef,
        errorRef,
    };
};
