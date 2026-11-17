import ForumOutlined from '@mui/icons-material/ForumOutlined';
import Button from '@mui/material/Button';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { conversationPath } from '@/shared/lib/paths';

import type { UseViewingCardResult, ViewingAudience } from '../hooks/use-viewing-card';
import type { Viewing } from '../types';

export interface ViewingCardActionsProps {
    viewing: Viewing;
    audience: ViewingAudience;
    card: UseViewingCardResult;
}

/**
 * What the role can still do: confirm or decline a request (owners), message the other side once
 * confirmed, call it off — pushed right, away from the safe actions. The decline / cancel button
 * is the dialog's trigger, so focus returns to it on close (A11Y-3). The conversation is linked
 * by path only: this feature never imports the message feature.
 */
export function ViewingCardActions({ viewing, audience, card }: ViewingCardActionsProps): ReactElement | null {
    const { t } = useTranslation('viewing');
    const { decide, ownerActs, tenantActs, canMessage, triggerRef, run, setDialog } = card;
    if (!ownerActs && !tenantActs && !canMessage) {
        return null;
    }
    const isConfirmed = viewing.status === 'CONFIRMED';
    return (
        <div className="flex flex-wrap items-center gap-2">
            {ownerActs && viewing.status === 'REQUESTED' && (
                <>
                    <Button
                        variant="contained"
                        loading={decide.isPending && decide.variables.decision === 'confirm'}
                        disabled={decide.isPending}
                        onClick={() => {
                            run('confirm');
                        }}
                    >
                        {t('card.confirm')}
                    </Button>
                    <Button
                        ref={triggerRef}
                        variant="outlined"
                        color="error"
                        disabled={decide.isPending}
                        onClick={() => {
                            setDialog('decline');
                        }}
                    >
                        {t('card.decline')}
                    </Button>
                </>
            )}
            {canMessage && (
                <Button
                    component={RouterLink}
                    to={conversationPath(viewing.id)}
                    variant="outlined"
                    startIcon={<ForumOutlined aria-hidden />}
                >
                    {t(audience === 'owner' ? 'card.messageTenant' : 'card.messageLister')}
                </Button>
            )}
            {((ownerActs && isConfirmed) || tenantActs) && (
                <Button
                    ref={isConfirmed || audience === 'tenant' ? triggerRef : undefined}
                    variant="text"
                    color="error"
                    disabled={decide.isPending}
                    onClick={() => {
                        setDialog('cancel');
                    }}
                    className="sm:ml-auto"
                >
                    {t('card.cancel')}
                </Button>
            )}
        </div>
    );
}
