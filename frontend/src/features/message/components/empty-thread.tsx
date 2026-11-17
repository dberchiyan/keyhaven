import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/shared/components/brand-mark';
import { InitialsAvatar } from '@/shared/components/initials-avatar';

import { splitName } from '../format';
import type { ConversationDetail } from '../types';

export interface EmptyThreadProps {
    conversation: ConversationDetail;
    closedText: string;
}

/**
 * A conversation without messages yet (a confirmed viewing opens one): the person, or Keyhaven's
 * mark, large, and a nudge to say hello — or why one cannot.
 */
export function EmptyThread({ conversation, closedText }: EmptyThreadProps): ReactElement {
    const { t } = useTranslation('message');
    const isKeyhaven = conversation.counterpart.kind === 'KEYHAVEN';
    const { firstName, lastName } = splitName(conversation.counterpart.name);
    const openHint = isKeyhaven ? t('thread.emptySupportHint') : t('thread.emptyHint');
    return (
        <div className="m-auto flex max-w-sm flex-col items-center gap-2 text-center">
            {isKeyhaven ? (
                <BrandMark className="size-16" />
            ) : (
                <InitialsAvatar
                    id={conversation.counterpart.name}
                    firstName={firstName}
                    lastName={lastName}
                    size="lg"
                />
            )}
            <Typography variant="subtitle1" component="p">
                {isKeyhaven ? t('thread.emptySupport') : t('thread.empty', { name: firstName })}
            </Typography>
            <Typography variant="body2" color="textSecondary">
                {conversation.isOpen ? openHint : closedText}
            </Typography>
        </div>
    );
}
