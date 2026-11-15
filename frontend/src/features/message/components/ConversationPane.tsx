import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { useAccess } from '@/features/auth';
import { displayStatus, formatSlot, ViewingStatusBadge, zoneName } from '@/features/viewing';
import { BrandMark } from '@/shared/components/BrandMark';
import { InitialsAvatar } from '@/shared/components/InitialsAvatar';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { cn } from '@/shared/lib/cn';
import { formatAgo } from '@/shared/lib/formatAgo';
import { listingPath, managedListingPath, PATHS } from '@/shared/lib/paths';
import { formatDayDivider, groupByDay } from '../format';
import { useConversation, useMarkRead, useSetConversationClosed } from '../hooks/useMessageQueries';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { MessageError } from './MessageError';

/** This close to the end counts as "at the bottom": new messages scroll into view on their own. */
const NEAR_BOTTOM_PX = 80;

export interface ConversationPaneProps {
  conversationId: string;
}

/**
 * One conversation: who is on the other end and what it is about (a viewing and its home, or a
 * request's subject), the messages by day in runs (a name once, a time at the end, "Seen" under
 * one's own), a "New" line above what was unread when it opened, and the composer while it is
 * open. Opening it (and every new message that arrives while it is open) marks it read; a
 * reader who scrolled up is told about new messages instead of being pulled down. The staff
 * closes and reopens a request from here.
 */
export function ConversationPane({ conversationId }: ConversationPaneProps) {
  const { t, i18n } = useTranslation(['message', 'errors']);
  const can = useAccess();
  const thread = useConversation(conversationId);
  const markRead = useMarkRead();
  const setClosed = useSetConversationClosed();
  const markReadMutate = markRead.mutate;
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [now] = useState(() => Date.now());
  const [behind, setBehind] = useState(0);
  const [seenCount, setSeenCount] = useState(0);
  const unread = thread.data?.unread ?? 0;
  const count = thread.data?.messages.length ?? 0;
  const readAt = thread.data?.readAt;

  // What arrived unread is read now that it is on screen (a mutation, not a fetch); the marker
  // as it stood goes with it, for the "New" line.
  useEffect(() => {
    if (unread > 0) {
      markReadMutate({ conversationId, readAtBefore: readAt ?? null });
    }
  }, [unread, readAt, conversationId, markReadMutate]);
  // What was unread when the thread was last marked read: the "New" line sits above it.
  const newSince = markRead.variables?.readAtBefore ?? null;

  // The newest message is the one to see — unless the reader scrolled up to read older ones:
  // then a pill counts what arrived below.
  useEffect(() => {
    const list = listRef.current;
    if (!list || count === 0) {
      return;
    }
    if (atBottomRef.current || seenCount === 0) {
      list.scrollTop = list.scrollHeight;
      setBehind(0);
    } else {
      setBehind((value) => value + (count - seenCount));
    }
    setSeenCount(count);
  }, [count, seenCount]);

  if (thread.isPending) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3 p-4">
        <span className="sr-only">{t('message:thread.loading')}</span>
        <Skeleton variant="rounded" className="h-14 w-full" />
        <Skeleton variant="rounded" className="h-10 w-3/5 self-end" />
        <Skeleton variant="rounded" className="h-10 w-2/3" />
      </div>
    );
  }
  if (thread.isError) {
    return (
      <div className="p-4">
        <MessageError error={thread.error} onRetry={() => void thread.refetch()} />
      </div>
    );
  }
  const conversation = thread.data;
  const support = conversation.kind === 'SUPPORT';
  const keyhaven = conversation.counterpart.kind === 'KEYHAVEN';
  const listing = conversation.listing;
  const homeHref = listing
    ? can('home.manage')
      ? managedListingPath(listing.id)
      : listingPath(listing.id)
    : null;
  const groups = groupByDay(conversation.messages);
  const address = listing?.address
    ? [listing.address.line1, listing.address.line2].filter(Boolean).join(', ')
    : null;
  const [firstName = '', lastName = ''] = conversation.counterpart.name.split(' ');
  // The first message from the other side after the marker gets the "New" line.
  const firstNewId =
    markRead.variables === undefined
      ? null
      : (conversation.messages.find(
          (message) =>
            message.side !== conversation.side &&
            (newSince === null || message.createdAt > newSince),
        )?.id ?? null);
  const scrollToEnd = (): void => {
    const list = listRef.current;
    if (list) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
    setBehind(0);
  };
  const closedText = support
    ? can('message.manage')
      ? t('message:thread.closedSupportStaff')
      : t('message:thread.closedSupport')
    : t('message:thread.closed');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-divider px-3 py-2.5 md:px-4">
        <IconButton
          component={RouterLink}
          to={PATHS.messages}
          aria-label={t('message:thread.back')}
          className="md:hidden"
        >
          <ArrowBackOutlined aria-hidden />
        </IconButton>
        {keyhaven ? (
          <BrandMark className="size-9" />
        ) : (
          <InitialsAvatar
            id={conversation.counterpart.name}
            firstName={firstName}
            lastName={lastName}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <Typography variant="subtitle1" component="h2" className="leading-tight truncate">
            {conversation.counterpart.name}
          </Typography>
          <Typography variant="caption" color="textSecondary" className="truncate">
            {t(`message:thread.kind.${conversation.counterpart.kind}`)}
            {support && conversation.support && ` · ${conversation.support.subject}`}
            {!support && listing && homeHref && (
              <>
                {' · '}
                <Link component={RouterLink} to={homeHref} underline="hover" color="inherit">
                  {listing.title}
                </Link>
              </>
            )}
          </Typography>
        </div>
        {conversation.viewing && (
          <ViewingStatusBadge
            status={displayStatus(conversation.viewing, now)}
            className="shrink-0"
          />
        )}
        {support && (
          <StatusBadge
            tone={conversation.open ? 'success' : 'neutral'}
            label={conversation.open ? t('message:thread.open') : t('message:thread.closedBadge')}
            className="shrink-0"
          />
        )}
        {support && can('message.manage') && (
          <Button
            size="small"
            variant={conversation.open ? 'outlined' : 'contained'}
            loading={setClosed.isPending}
            onClick={() => {
              setClosed.mutate({ conversationId, closed: conversation.open });
            }}
            className="shrink-0"
          >
            {conversation.open ? t('message:thread.close') : t('message:thread.reopen')}
          </Button>
        )}
      </header>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-divider bg-background px-3 py-1.5 md:px-4">
        {conversation.viewing && listing && (
          <Typography variant="caption" color="textSecondary" className="app-tabular">
            {t('message:thread.when', {
              when: formatSlot(conversation.viewing.startsAt, listing.city.timeZone, i18n.language),
              zone: zoneName(listing.city.timeZone, i18n.language),
            })}
          </Typography>
        )}
        {conversation.support && (
          <Typography variant="caption" color="textSecondary" className="app-tabular">
            {t('message:thread.opened', {
              when:
                formatAgo(conversation.support.openedAt, now, i18n.language) ??
                t('message:thread.justNow'),
            })}
          </Typography>
        )}
        {support && listing && homeHref && (
          <Typography variant="caption" color="textSecondary" className="truncate">
            <Link component={RouterLink} to={homeHref} underline="hover" color="inherit">
              {listing.title}
            </Link>
          </Typography>
        )}
        {address && (
          <Typography
            variant="caption"
            color="textSecondary"
            className="inline-flex items-center gap-1"
          >
            <PlaceOutlined aria-hidden fontSize="inherit" />
            {address}
          </Typography>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={listRef}
          onScroll={(event) => {
            const list = event.currentTarget;
            const atBottom =
              list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX;
            atBottomRef.current = atBottom;
            if (atBottom && behind > 0) {
              setBehind(0);
            }
          }}
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4 md:px-5"
          aria-live="polite"
          aria-label={t('message:thread.messages')}
        >
          {conversation.messages.length === 0 ? (
            <div className="m-auto flex max-w-sm flex-col items-center gap-2 text-center">
              {keyhaven ? (
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
                {keyhaven
                  ? t('message:thread.emptySupport')
                  : t('message:thread.empty', { name: firstName })}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {conversation.open
                  ? keyhaven
                    ? t('message:thread.emptySupportHint')
                    : t('message:thread.emptyHint')
                  : closedText}
              </Typography>
            </div>
          ) : (
            groups.map((group) => (
              <Fragment key={group.day}>
                <Typography
                  variant="caption"
                  component="div"
                  color="textSecondary"
                  className="my-3 self-center rounded-full border border-divider bg-background-paper px-3 py-0.5"
                >
                  {formatDayDivider(group.messages[0]?.message.createdAt ?? '', now, i18n.language)}
                </Typography>
                {group.messages.map(({ message, position }) => (
                  <Fragment key={message.id}>
                    {message.id === firstNewId && (
                      <div
                        role="separator"
                        aria-label={t('message:thread.newLabel')}
                        className="my-2 flex items-center gap-3"
                      >
                        <span aria-hidden className="h-px flex-1 bg-primary/40" />
                        <Typography
                          variant="caption"
                          component="span"
                          className="rounded-full bg-badge-active-background px-2 py-0.5 text-badge-active-text"
                        >
                          {t('message:thread.new')}
                        </Typography>
                        <span aria-hidden className="h-px flex-1 bg-primary/40" />
                      </div>
                    )}
                    <MessageBubble
                      message={message}
                      own={message.side === conversation.side}
                      position={position}
                      seen={
                        conversation.seenAt !== null && conversation.seenAt >= message.createdAt
                      }
                      {...(support && message.side === 'RESPONDER'
                        ? {
                            senderLabel: t('message:thread.staffName', {
                              name: message.sender.firstName,
                            }),
                          }
                        : {})}
                    />
                  </Fragment>
                ))}
              </Fragment>
            ))
          )}
        </div>
        {behind > 0 && (
          <Button
            variant="contained"
            size="small"
            startIcon={<ArrowDownwardOutlined aria-hidden />}
            onClick={scrollToEnd}
            className={cn('absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md')}
          >
            {t('message:thread.behind', { count: behind })}
          </Button>
        )}
      </div>
      {setClosed.isError && (
        <Alert severity="error" role="alert" className="mx-3 md:mx-4">
          {t(`errors:${setClosed.error.code}`)}
        </Alert>
      )}
      {conversation.open ? (
        <MessageComposer conversationId={conversation.id} counterpart={firstName} />
      ) : (
        <Alert severity="info" icon={false} className="m-3 md:m-4">
          {closedText}
        </Alert>
      )}
    </div>
  );
}
