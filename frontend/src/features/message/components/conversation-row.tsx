import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { formatSlotDate } from '@/features/viewing';
import { cn } from '@/shared/lib/cn';
import { conversationPath } from '@/shared/lib/paths';

import { formatInboxTime } from '../format';
import type { Conversation } from '../types';
import { ConversationAvatar } from './conversation-avatar';

export interface ConversationRowProps {
    conversation: Conversation;
    isSelected: boolean;
    now: number;
}

/**
 * One inbox row: the person's initials (keyed by the name, so one person wears one colour in every
 * conversation) with the home's cover in the corner — which home, without a second column — or
 * Keyhaven's mark for a request; the home or the subject, the last line, the time, a count while
 * unread. The unread count is in the link's name, as the pill is hidden from screen readers. A last
 * line whose writer erased their account reads "removed" in italics, like a closed one.
 */
export function ConversationRow({ conversation, isSelected, now }: ConversationRowProps): ReactElement {
    const { t, i18n } = useTranslation('message');
    const isUnread = conversation.unread > 0;
    const last = conversation.lastMessage;
    const slotDateLabel =
        conversation.viewing && conversation.listing
            ? formatSlotDate(conversation.viewing.startsAt, conversation.listing.city.timeZone, i18n.language)
            : '';
    const when = last ? formatInboxTime(last.createdAt, now, i18n.language) : slotDateLabel;
    const ownLast = last !== null && last.side === conversation.side;
    const isSeen = last !== null && ownLast && conversation.seenAt !== null && conversation.seenAt >= last.createdAt;
    const lastText = last?.isRemoved ? t('thread.removed') : (last?.body ?? '');
    const ownText = last && ownLast ? t('inbox.youWrote', { text: lastText }) : undefined;
    const preview = last ? (ownText ?? lastText) : t('inbox.noMessages', { when: slotDateLabel });
    const isPreviewMuted = !conversation.isOpen || last?.isRemoved === true;
    const closedLine = conversation.kind === 'SUPPORT' ? t('inbox.closedSupport') : t('inbox.closed');
    const isKeyhaven = conversation.counterpart.kind === 'KEYHAVEN';
    return (
        <NavLink
            to={conversationPath(conversation.id)}
            aria-current={isSelected ? 'page' : undefined}
            aria-label={
                isUnread
                    ? t('inbox.rowUnread', {
                          name: conversation.counterpart.name,
                          count: conversation.unread,
                      })
                    : conversation.counterpart.name
            }
            className={cn(
                'app-hover-fade relative flex min-h-16 gap-4 rounded-md px-2 py-2.5 text-inherit no-underline hover:bg-action-hover',
                isSelected && 'bg-badge-active-background hover:bg-badge-active-background',
            )}
        >
            {isSelected && <span aria-hidden className="absolute inset-y-3 -left-2 w-1 rounded-r-sm bg-primary" />}
            <ConversationAvatar
                name={conversation.counterpart.name}
                isKeyhaven={isKeyhaven}
                hasListing={conversation.listing !== null}
                coverPhotoUrl={conversation.listing?.coverPhotoUrl ?? null}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline gap-2">
                    {isUnread && <span aria-hidden className="size-2 shrink-0 self-center rounded-full bg-primary" />}
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <Typography variant={isUnread ? 'subtitle2' : 'body2'} component="span" className="truncate">
                            {conversation.counterpart.name}
                        </Typography>
                        {conversation.kind === 'SUPPORT' && !isKeyhaven && (
                            <Typography variant="caption" component="span" color="textSecondary" className="shrink-0">
                                {t(`thread.kind.${conversation.counterpart.kind}`)}
                            </Typography>
                        )}
                    </span>
                    <Typography
                        variant="caption"
                        component="span"
                        color={isUnread ? 'primary' : 'textSecondary'}
                        className="app-tabular shrink-0"
                    >
                        {when}
                    </Typography>
                </div>
                <Typography variant="caption" color="textSecondary" className="truncate">
                    {conversation.support?.subject ?? conversation.listing?.title ?? ''}
                </Typography>
                <div className="flex items-center gap-2">
                    {isSeen && (
                        <DoneAllOutlined
                            aria-label={t('thread.seen')}
                            fontSize="inherit"
                            className="shrink-0 text-primary"
                        />
                    )}
                    <Typography
                        variant="body2"
                        component="span"
                        color={isUnread ? undefined : 'textSecondary'}
                        className={cn('min-w-0 flex-1 truncate', isPreviewMuted && 'app-removed')}
                    >
                        {conversation.isOpen ? preview : closedLine}
                    </Typography>
                    {isUnread && (
                        <Typography
                            variant="caption"
                            component="span"
                            aria-hidden
                            className="app-tabular inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-primary-contrast-text"
                        >
                            {conversation.unread}
                        </Typography>
                    )}
                </div>
            </div>
        </NavLink>
    );
}
