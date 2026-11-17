import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { formatSlot, zoneName } from '@/features/viewing';
import { formatAgo } from '@/shared/lib/format-ago';

import type { ConversationDetail } from '../types';

export interface ConversationContextBarProps {
    conversation: ConversationDetail;
    homeHref: string | undefined;
    now: number;
}

/**
 * The viewing's time in the home's own zone (unlike chat times, which follow the reader's clock),
 * when a request was opened, its home, and the address once the server reveals it.
 */
export function ConversationContextBar({ conversation, homeHref, now }: ConversationContextBarProps): ReactElement {
    const { t, i18n } = useTranslation('message');
    const { listing } = conversation;
    const address = listing?.address
        ? [listing.address.line1, listing.address.line2].filter(Boolean).join(', ')
        : undefined;
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-divider bg-background px-3 py-1.5 md:px-4">
            {conversation.viewing && listing && (
                <Typography variant="caption" color="textSecondary" className="app-tabular">
                    {t('thread.when', {
                        when: formatSlot(conversation.viewing.startsAt, listing.city.timeZone, i18n.language),
                        zone: zoneName(listing.city.timeZone, i18n.language),
                    })}
                </Typography>
            )}
            {conversation.support && (
                <Typography variant="caption" color="textSecondary" className="app-tabular">
                    {t('thread.opened', {
                        when: formatAgo(conversation.support.openedAt, now, i18n.language) ?? t('thread.justNow'),
                    })}
                </Typography>
            )}
            {conversation.kind === 'SUPPORT' && listing && homeHref && (
                <Typography variant="caption" color="textSecondary" className="truncate">
                    <Link component={RouterLink} to={homeHref} underline="hover" color="inherit">
                        {listing.title}
                    </Link>
                </Typography>
            )}
            {address && (
                <Typography variant="caption" color="textSecondary" className="inline-flex items-center gap-1">
                    <PlaceOutlined aria-hidden fontSize="inherit" />
                    {address}
                </Typography>
            )}
        </div>
    );
}
