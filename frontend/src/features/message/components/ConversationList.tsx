import AddCommentOutlined from '@mui/icons-material/AddCommentOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router';
import { useAccess } from '@/features/auth';
import { formatSlotDate } from '@/features/viewing';
import { BrandMark } from '@/shared/components/BrandMark';
import { InitialsAvatar } from '@/shared/components/InitialsAvatar';
import { RowSkeleton } from '@/shared/components/RowSkeleton';
import { cn } from '@/shared/lib/cn';
import { conversationPath } from '@/shared/lib/paths';
import { formatInboxTime } from '../format';
import { type InboxFilter, useInboxFilter } from '../hooks/useInboxFilter';
import { useConversations } from '../hooks/useMessageQueries';
import type { Conversation } from '../types';
import { MessageError } from './MessageError';
import { NewConversationDialog } from './NewConversationDialog';

const ROWS = ['a', 'b', 'c', 'd'] as const;
const FILTERS = ['all', 'unread'] as const satisfies readonly InboxFilter[];

export interface ConversationListProps {
  /** The thread open beside the list (desktop) — its row is marked. */
  selectedId: string | null;
}

/**
 * The inbox: a heading with the count, an All / Unread switch and, for members, a pinned
 * "Write to Keyhaven" entry (the brand's mark, so it reads as a contact, not a generic "new" —
 * the staff has no one to ask), then one row per conversation, latest message first — the
 * person on the other end (their initials, the home's cover in the corner; Keyhaven's mark for
 * a request), the home or the subject, the last line, the time, a count while unread.
 */
export function ConversationList({ selectedId }: ConversationListProps) {
  const { t, i18n } = useTranslation('message');
  const can = useAccess();
  const navigate = useNavigate();
  const inbox = useConversations();
  const { filter, setFilter } = useInboxFilter();
  const [now] = useState(() => Date.now());
  // A counter, not a boolean: each opening remounts the dialog (its own Idempotency-Key).
  const [opening, setOpening] = useState(0);
  const unreadTotal = inbox.data?.reduce((sum, row) => sum + row.unread, 0) ?? 0;
  const rows = inbox.data?.filter((row) => filter === 'all' || row.unread > 0) ?? [];
  const format = new Intl.NumberFormat(i18n.language);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b border-divider px-3 py-2.5">
        <Typography variant="subtitle1" component="h2" className="app-tabular">
          {t('inbox.title')}
          {inbox.data && (
            <Typography variant="caption" component="span" color="textSecondary" className="ml-1.5">
              {format.format(inbox.data.length)}
            </Typography>
          )}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          aria-label={t('inbox.filterLabel')}
          onChange={(_event, value: InboxFilter | null) => {
            if (value !== null) {
              setFilter(value);
            }
          }}
          className="w-full"
        >
          {FILTERS.map((option) => (
            <ToggleButton key={option} value={option} className="flex-1 gap-1.5">
              {t(`inbox.filter.${option}`)}
              {option === 'unread' && unreadTotal > 0 && (
                <Typography
                  variant="caption"
                  component="span"
                  aria-hidden
                  className="app-tabular inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-primary-contrast-text"
                >
                  {format.format(unreadTotal)}
                </Typography>
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {can('message.start') && (
          // A pinned contact rather than a "+ New" button: the mark and the name say who reads it.
          <button
            type="button"
            onClick={() => {
              setOpening((value) => value + 1);
            }}
            className="hover:bg-action-hover flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-divider bg-background px-2.5 py-2 text-left text-inherit outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <BrandMark className="size-9" />
            <span className="flex min-w-0 flex-1 flex-col">
              <Typography variant="subtitle2" component="span">
                {t('inbox.support.title')}
              </Typography>
              <Typography variant="caption" color="textSecondary" className="truncate">
                {t('inbox.support.hint')}
              </Typography>
            </span>
            <AddCommentOutlined aria-hidden fontSize="small" className="shrink-0 text-primary" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {inbox.isPending ? (
          <div role="status" aria-busy="true" className="flex flex-col gap-1 p-3">
            <span className="sr-only">{t('inbox.loading')}</span>
            {ROWS.map((row) => (
              <RowSkeleton key={row} trailing={false} />
            ))}
          </div>
        ) : inbox.isError ? (
          <div className="p-3">
            <MessageError error={inbox.error} onRetry={() => void inbox.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            {filter === 'unread' ? (
              <DoneAllOutlined aria-hidden fontSize="large" color="disabled" />
            ) : (
              <ChatBubbleOutlineOutlined aria-hidden fontSize="large" color="disabled" />
            )}
            <Typography variant="subtitle1" component="p">
              {filter === 'unread' ? t('inbox.allRead') : t('inbox.empty')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {filter === 'unread'
                ? t('inbox.allReadHint')
                : can('message.manage')
                  ? t('inbox.emptyHintStaff')
                  : can('viewing.book')
                    ? t('inbox.emptyHintTenant')
                    : t('inbox.emptyHintOwner')}
            </Typography>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0 py-1" aria-label={t('inbox.title')}>
            {rows.map((conversation) => (
              <li key={conversation.id}>
                <ConversationRow
                  conversation={conversation}
                  selected={conversation.id === selectedId}
                  now={now}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {opening > 0 && (
        <NewConversationDialog
          key={opening}
          open
          onClose={() => {
            setOpening(0);
          }}
          onStarted={(conversationId) => {
            setOpening(0);
            void navigate(conversationPath(conversationId));
          }}
        />
      )}
    </div>
  );
}

interface ConversationRowProps {
  conversation: Conversation;
  selected: boolean;
  now: number;
}

function ConversationRow({ conversation, selected, now }: ConversationRowProps) {
  const { t, i18n } = useTranslation('message');
  const unread = conversation.unread > 0;
  const last = conversation.lastMessage;
  const slotDay =
    conversation.viewing && conversation.listing
      ? formatSlotDate(
          conversation.viewing.startsAt,
          conversation.listing.city.timeZone,
          i18n.language,
        )
      : '';
  const when = last ? formatInboxTime(last.createdAt, now, i18n.language) : slotDay;
  const ownLast = last !== null && last.side === conversation.side;
  const seen =
    last !== null &&
    ownLast &&
    conversation.seenAt !== null &&
    conversation.seenAt >= last.createdAt;
  const preview = last
    ? ownLast
      ? t('inbox.youWrote', { text: last.body })
      : last.body
    : t('inbox.noMessages', { when: slotDay });
  const closedLine = conversation.kind === 'SUPPORT' ? t('inbox.closedSupport') : t('inbox.closed');
  const [firstName = '', lastName = ''] = conversation.counterpart.name.split(' ');
  const keyhaven = conversation.counterpart.kind === 'KEYHAVEN';
  return (
    <NavLink
      to={conversationPath(conversation.id)}
      aria-current={selected ? 'page' : undefined}
      aria-label={
        unread
          ? t('inbox.rowUnread', {
              name: conversation.counterpart.name,
              count: conversation.unread,
            })
          : conversation.counterpart.name
      }
      className={cn(
        'hover:bg-action-hover relative mx-2 flex min-h-16 gap-3 rounded-md px-2 py-2.5 text-inherit no-underline transition-colors',
        selected && 'bg-badge-active-background hover:bg-badge-active-background',
      )}
    >
      {selected && (
        <span aria-hidden className="absolute inset-y-3 -left-2 w-1 rounded-r-sm bg-primary" />
      )}
      <div className="relative shrink-0">
        {keyhaven ? (
          <BrandMark className="size-12" />
        ) : (
          <InitialsAvatar
            // Keyed by the name: the same person wears one colour across every conversation.
            id={conversation.counterpart.name}
            firstName={firstName}
            lastName={lastName}
            size="lg"
            className="size-12"
          />
        )}
        {/* The home's cover in the corner: which home, without a second column. */}
        {conversation.listing && (
          <span className="absolute -right-1 -bottom-1 size-6 overflow-hidden rounded-sm border-2 border-background-paper bg-badge-neutral-background">
            {conversation.listing.coverPhotoUrl && (
              <img
                src={conversation.listing.coverPhotoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
                className="size-full object-cover"
              />
            )}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          {unread && (
            <span aria-hidden className="size-2 shrink-0 self-center rounded-full bg-primary" />
          )}
          <Typography
            variant={unread ? 'subtitle2' : 'body2'}
            component="span"
            className="min-w-0 flex-1 truncate"
          >
            {conversation.counterpart.name}
            {conversation.kind === 'SUPPORT' && !keyhaven && (
              <Typography
                variant="caption"
                component="span"
                color="textSecondary"
                className="ml-1.5"
              >
                {t(`thread.kind.${conversation.counterpart.kind}`)}
              </Typography>
            )}
          </Typography>
          <Typography
            variant="caption"
            component="span"
            color={unread ? 'primary' : 'textSecondary'}
            className="app-tabular shrink-0"
          >
            {when}
          </Typography>
        </div>
        <Typography variant="caption" color="textSecondary" className="truncate">
          {conversation.support?.subject ?? conversation.listing?.title ?? ''}
        </Typography>
        <div className="flex items-center gap-2">
          {seen && (
            <DoneAllOutlined
              aria-label={t('thread.seen')}
              fontSize="inherit"
              className="shrink-0 text-primary"
            />
          )}
          <Typography
            variant="body2"
            component="span"
            color={unread ? undefined : 'textSecondary'}
            className={cn('min-w-0 flex-1 truncate', !conversation.open && 'italic')}
          >
            {conversation.open ? preview : closedLine}
          </Typography>
          {unread && (
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
