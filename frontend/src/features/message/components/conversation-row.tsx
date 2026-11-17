import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { formatSlotDate } from '@/features/viewing';
import { BrandMark } from '@/shared/components/brand-mark';
import { InitialsAvatar } from '@/shared/components/initials-avatar';
import { cn } from '@/shared/lib/cn';
import { conversationPath } from '@/shared/lib/paths';

import { formatInboxTime, splitName } from '../format';
import type { Conversation } from '../types';

const COVER_PX = 48;

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
    const slotDay =
        conversation.viewing && conversation.listing
            ? formatSlotDate(conversation.viewing.startsAt, conversation.listing.city.timeZone, i18n.language)
            : '';
    const when = last ? formatInboxTime(last.createdAt, now, i18n.language) : slotDay;
    const ownLast = last !== null && last.side === conversation.side;
    const isSeen = last !== null && ownLast && conversation.seenAt !== null && conversation.seenAt >= last.createdAt;
    const lastText = last?.isRemoved ? t('thread.removed') : (last?.body ?? '');
    const ownText = last && ownLast ? t('inbox.youWrote', { text: lastText }) : undefined;
    const preview = last ? (ownText ?? lastText) : t('inbox.noMessages', { when: slotDay });
    const isPreviewMuted = !conversation.isOpen || last?.isRemoved === true;
    const closedLine = conversation.kind === 'SUPPORT' ? t('inbox.closedSupport') : t('inbox.closed');
    const { firstName, lastName } = splitName(conversation.counterpart.name);
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
                'hover:bg-action-hover relative mx-2 flex min-h-16 gap-3 rounded-md px-2 py-2.5 text-inherit no-underline transition-colors',
                isSelected && 'bg-badge-active-background hover:bg-badge-active-background',
            )}
        >
            {isSelected && <span aria-hidden className="absolute inset-y-3 -left-2 w-1 rounded-r-sm bg-primary" />}
            <div className="relative shrink-0">
                {isKeyhaven ? (
                    <BrandMark className="size-12" />
                ) : (
                    <InitialsAvatar
                        id={conversation.counterpart.name}
                        firstName={firstName}
                        lastName={lastName}
                        size="lg"
                        className="size-12"
                    />
                )}
                {conversation.listing && (
                    <span className="absolute -right-1 -bottom-1 size-6 overflow-hidden rounded-sm border-2 border-background-paper bg-badge-neutral-background">
                        {conversation.listing.coverPhotoUrl && (
                            <img
                                src={conversation.listing.coverPhotoUrl}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                width={COVER_PX}
                                height={COVER_PX}
                                className="size-full object-cover"
                            />
                        )}
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                    {isUnread && <span aria-hidden className="size-2 shrink-0 self-center rounded-full bg-primary" />}
                    <Typography
                        variant={isUnread ? 'subtitle2' : 'body2'}
                        component="span"
                        className="min-w-0 flex-1 truncate"
                    >
                        {conversation.counterpart.name}
                        {conversation.kind === 'SUPPORT' && !isKeyhaven && (
                            <Typography variant="caption" component="span" color="textSecondary" className="ml-1.5">
                                {t(`thread.kind.${conversation.counterpart.kind}`)}
                            </Typography>
                        )}
                    </Typography>
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
                        className={cn('min-w-0 flex-1 truncate', isPreviewMuted && 'italic')}
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
