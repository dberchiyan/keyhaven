import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';

import type { InboxFilter } from '../hooks/use-inbox-filter';

export interface InboxEmptyProps {
    filter: InboxFilter;
}

/**
 * An empty inbox says how a conversation starts for this role (a tenant books a viewing, an owner
 * confirms one, the staff waits for a request); an empty Unread view says all is read. Smaller than
 * the shared EmptyState: it sits in a narrow column.
 */
export function InboxEmpty({ filter }: InboxEmptyProps): ReactElement {
    const { t } = useTranslation('message');
    const can = useAccess();
    const isUnread = filter === 'unread';
    const Icon = isUnread ? DoneAllOutlined : ChatBubbleOutlineOutlined;
    const roleHint = can('viewing.book') ? t('inbox.emptyHintTenant') : t('inbox.emptyHintOwner');
    const emptyHint = can('message.manage') ? t('inbox.emptyHintStaff') : roleHint;
    return (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Icon aria-hidden fontSize="large" color="disabled" />
            <Typography variant="subtitle1" component="p">
                {isUnread ? t('inbox.allRead') : t('inbox.empty')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
                {isUnread ? t('inbox.allReadHint') : emptyHint}
            </Typography>
        </div>
    );
}
