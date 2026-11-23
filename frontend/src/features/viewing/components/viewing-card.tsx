import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import { useViewingCard, type ViewingAudience } from '../hooks/use-viewing-card';
import type { Viewing } from '../types';
import { ViewingCardActions } from './viewing-card-actions';
import { ViewingCardDetails } from './viewing-card-details';
import { ViewingCardHeading } from './viewing-card-heading';
import { ViewingDecisionDialog } from './viewing-decision-dialog';
import { ViewingTimeBlock } from './viewing-time-block';

export interface ViewingCardProps {
    viewing: Viewing;
    audience: ViewingAudience;
    canDecide?: boolean;
    onChanged?: () => void;
    hideListing?: boolean;
    showDate?: boolean;
}

/**
 * One viewing as an agenda row: the time in the home's zone on the left; the home, the status,
 * who asked or the address, the notes and the actions the role still has. A request waiting for
 * an answer carries an amber edge, so it reads as work.
 */
export function ViewingCard({
    viewing,
    audience,
    canDecide = true,
    onChanged,
    hideListing = false,
    showDate = true,
}: ViewingCardProps): ReactElement {
    const { t } = useTranslation('errors');
    const card = useViewingCard(viewing, audience, canDecide, onChanged);
    const { decide, dialog, setDialog, run, status, subject, triggerRef, errorRef } = card;

    return (
        <Card
            variant="outlined"
            component="article"
            aria-label={subject}
            className={cn(
                'flex flex-col gap-4 p-4 sm:flex-row',
                status === 'REQUESTED' && 'border-l-4 border-l-status-warning-dot',
            )}
        >
            <ViewingTimeBlock viewing={viewing} status={status} showDate={showDate} />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
                <ViewingCardHeading viewing={viewing} audience={audience} status={status} hideListing={hideListing} />
                <ViewingCardDetails
                    viewing={viewing}
                    audience={audience}
                    hideListing={hideListing}
                    address={card.address}
                    upcoming={card.upcoming}
                />
                <ViewingCardActions viewing={viewing} audience={audience} card={card} />
                {decide.isError && (
                    <Alert ref={errorRef} tabIndex={-1} severity="error" role="alert" className="outline-none">
                        {t(decide.error.code)}
                    </Alert>
                )}
            </div>
            {dialog !== undefined && (
                <ViewingDecisionDialog
                    open
                    kind={dialog}
                    subject={subject}
                    isPending={decide.isPending}
                    onCancel={() => {
                        setDialog(undefined);
                        triggerRef.current?.focus();
                    }}
                    onConfirm={(note) => {
                        run(dialog, note);
                    }}
                />
            )}
        </Card>
    );
}
