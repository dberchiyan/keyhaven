import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import MarkEmailUnreadOutlined from '@mui/icons-material/MarkEmailUnreadOutlined';
import Card from '@mui/material/Card';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useUnreadMessages } from '@/features/message';
import { useViewingSummary } from '@/features/viewing';
import { cn } from '@/shared/lib/cn';
import { PATHS } from '@/shared/lib/paths';
import { useManagedListingCounts } from '../hooks/useListingQueries';

type ItemKey = 'requests' | 'messages' | 'drafts' | 'upcoming';

interface Item {
  key: ItemKey;
  count: number;
  to: string;
  icon: ComponentType<SvgIconProps>;
  /** Literal class names so Tailwind sees them: the tile's tone says how urgent it is. */
  tile: string;
}

/**
 * What waits for the owner, before the list: viewing requests to answer, unread messages,
 * drafts to finish, confirmed visits ahead — each a card that opens the right place. Shown only
 * while something is there; a quiet dashboard has no empty strip to explain.
 */
export function AttentionStrip() {
  const { t, i18n } = useTranslation('listing');
  const viewings = useViewingSummary();
  const unread = useUnreadMessages();
  const counts = useManagedListingCounts();
  const format = new Intl.NumberFormat(i18n.language);
  const all: Item[] = [
    {
      key: 'requests',
      count: viewings.data?.requested ?? 0,
      to: PATHS.viewings,
      icon: EventAvailableOutlined,
      tile: 'bg-status-warning-background text-status-warning-text',
    },
    {
      key: 'messages',
      count: unread.data?.unread ?? 0,
      to: PATHS.messages,
      icon: MarkEmailUnreadOutlined,
      tile: 'bg-badge-active-background text-badge-active-text',
    },
    {
      key: 'drafts',
      count: counts.data?.DRAFT ?? 0,
      to: `${PATHS.home}?status=DRAFT`,
      icon: EditNoteOutlined,
      tile: 'bg-badge-neutral-background text-badge-neutral-text',
    },
    {
      key: 'upcoming',
      count: viewings.data?.upcoming ?? 0,
      to: `${PATHS.viewings}?view=upcoming`,
      icon: ForumOutlined,
      tile: 'bg-status-success-background text-status-success-text',
    },
  ];
  const items = all.filter((item) => item.count > 0);
  if (items.length === 0) {
    return null;
  }
  return (
    <section aria-label={t('attention.label')} className="flex flex-col gap-2">
      <Typography variant="overline" component="h2" color="textSecondary">
        {t('attention.label')}
      </Typography>
      {/* The arbitrary template: as many cards a row as fit at 16 rem each (ux.md → intrinsic layout). */}
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:[grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))]">
        {items.map(({ key, count, to, icon: Icon, tile }) => (
          <li key={key}>
            <Card
              variant="outlined"
              component={Link}
              to={to}
              className="hover:bg-action-hover flex h-full items-center gap-3 p-3 text-inherit no-underline transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span
                aria-hidden
                className={cn(
                  'inline-flex size-11 shrink-0 items-center justify-center rounded-md',
                  tile,
                )}
              >
                <Icon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <Typography
                  variant="subtitle1"
                  component="span"
                  className="app-tabular leading-tight"
                >
                  {t(`attention.${key}`, { count, formatted: format.format(count) })}
                </Typography>
                <Typography variant="caption" color="textSecondary" className="truncate">
                  {t(`attention.${key}Hint`)}
                </Typography>
              </span>
              <ChevronRightOutlined
                aria-hidden
                fontSize="small"
                className="shrink-0 text-text-secondary"
              />
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
