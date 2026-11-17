import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { useUnreadMessages } from '@/features/message';
import { PATHS } from '@/shared/lib/paths';

const MAX_BADGE_COUNT = 99;

/** The tenant's way to the inbox with the unread count in its label (A11Y-7); listers have it in the sidebar. */
export function MessagesLink(): ReactElement {
    const { t } = useTranslation('shell');
    const unread = useUnreadMessages();
    const count = unread.data?.unread ?? 0;
    return (
        <Button
            component={NavLink}
            to={PATHS.messages}
            variant="text"
            aria-label={count > 0 ? t('site.messagesUnread', { count }) : undefined}
            className="hidden sm:inline-flex"
        >
            <Badge badgeContent={count} color="secondary" max={MAX_BADGE_COUNT} className="pr-1">
                {t('site.messages')}
            </Badge>
        </Button>
    );
}
