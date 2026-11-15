import ForumOutlined from '@mui/icons-material/ForumOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { InitialsAvatar } from '@/shared/components/InitialsAvatar';
import { cn } from '@/shared/lib/cn';
import { conversationPath, listingPath, managedListingPath } from '@/shared/lib/paths';
import {
  displayStatus,
  formatSlot,
  formatSlotDate,
  formatSlotTime,
  isUpcoming,
  zoneName,
} from '../format';
import { useDecideViewing } from '../hooks/useViewingQueries';
import type { Viewing } from '../types';
import { ViewingDecisionDialog } from './ViewingDecisionDialog';
import { ViewingStatusBadge } from './ViewingStatusBadge';

export interface ViewingCardProps {
  viewing: Viewing;
  /** The tenant's own card, or the owner's (with who asked and the answers). */
  audience: 'tenant' | 'owner';
  /** Whether this role answers requests (admins read only). */
  canDecide?: boolean;
  /** After a decision landed (the listing page re-reads the home, the address may have appeared). */
  onChanged?: () => void;
  /** The home's title is already the page's heading: skip the home line. */
  hideListing?: boolean;
  /** Under a day heading the date is known: the time block shows the hours only. */
  showDate?: boolean;
}

/**
 * One viewing as an agenda row: the time in the home's zone on the left; the home (cover,
 * title, place), the status, who asked (the owner's side) or the address (the tenant's, once
 * confirmed), the notes both sides wrote, and the actions the role still has for it.
 */
export function ViewingCard({
  viewing,
  audience,
  canDecide = true,
  onChanged,
  hideListing,
  showDate = true,
}: ViewingCardProps) {
  const { t, i18n } = useTranslation(['viewing', 'errors']);
  const decide = useDecideViewing();
  const [dialog, setDialog] = useState<'decline' | 'cancel' | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // "Now" once per mount: a card does not flip to "took place" while it is on screen.
  const [now] = useState(() => Date.now());
  const status = displayStatus(viewing, now);
  const upcoming = isUpcoming(viewing, now);
  const zone = viewing.listing.city.timeZone;
  const locale = i18n.language;
  const place = [
    viewing.listing.neighborhood,
    `${viewing.listing.city.name}, ${viewing.listing.city.state}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const subject = `${viewing.listing.title} — ${formatSlot(viewing.startsAt, zone, locale)}`;
  const to =
    audience === 'owner' ? managedListingPath(viewing.listing.id) : listingPath(viewing.listing.id);

  useEffect(() => {
    if (decide.isError) {
      errorRef.current?.focus();
    }
  }, [decide.isError]);

  const run = (decision: 'confirm' | 'decline' | 'cancel', note?: string): void => {
    decide.mutate(
      { id: viewing.id, decision, ...(note ? { note } : {}) },
      {
        onSuccess: () => {
          setDialog(null);
          onChanged?.();
        },
      },
    );
  };
  const ownerActs = audience === 'owner' && canDecide && upcoming;
  const tenantActs = audience === 'tenant' && upcoming;
  // The conversation opens with the confirmation and outlives the visit (by path only: the
  // message feature is not imported here).
  const canMessage = viewing.status === 'CONFIRMED' && (audience === 'tenant' || canDecide);
  const address =
    audience === 'tenant' && viewing.listing.address
      ? [viewing.listing.address.line1, viewing.listing.address.line2].filter(Boolean).join(', ')
      : null;

  return (
    <Card
      variant="outlined"
      component="article"
      aria-label={subject}
      className={cn(
        'flex flex-col gap-3 p-4 sm:flex-row sm:gap-5',
        status === 'REQUESTED' && 'border-l-4 border-l-status-warning-dot',
      )}
    >
      {/* The time block: the date (unless a day heading carries it), the hours, the zone. */}
      <div className="flex shrink-0 items-baseline gap-2 sm:w-28 sm:flex-col sm:gap-0.5 sm:border-r sm:border-divider sm:pr-4">
        {/* On a phone the status sits at the end of the time row, so the title keeps its width. */}
        <span className="order-last ml-auto sm:hidden">
          <ViewingStatusBadge status={status} />
        </span>
        {showDate && (
          <Typography variant="caption" color="textSecondary" className="app-tabular">
            {formatSlotDate(viewing.startsAt, zone, locale)}
          </Typography>
        )}
        <Typography variant="h6" component="p" className="app-tabular leading-tight">
          {formatSlotTime(viewing.startsAt, zone, locale)}
        </Typography>
        <Typography variant="caption" color="textSecondary" className="app-tabular">
          {t('viewing:card.until', {
            time: formatSlotTime(viewing.endsAt, zone, locale),
            zone: zoneName(zone, locale),
          })}
        </Typography>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          {!hideListing && (
            <div className="size-14 shrink-0 overflow-hidden rounded-md bg-badge-neutral-background">
              {viewing.listing.coverPhotoUrl && (
                <img
                  src={viewing.listing.coverPhotoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={112}
                  height={112}
                  className="size-full object-cover"
                />
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {hideListing ? (
              audience === 'owner' && viewing.tenant ? (
                <Typography variant="subtitle1" component="h3" className="truncate">
                  {`${viewing.tenant.firstName} ${viewing.tenant.lastName}`}
                </Typography>
              ) : (
                <Typography variant="subtitle1" component="h3" className="truncate">
                  {formatSlot(viewing.startsAt, zone, locale)}
                </Typography>
              )
            ) : (
              <>
                <Typography variant="subtitle1" component="h3" className="line-clamp-2">
                  <Link component={RouterLink} to={to} underline="hover" color="inherit">
                    {viewing.listing.title}
                  </Link>
                </Typography>
                <Typography variant="body2" color="textSecondary" className="truncate">
                  {place}
                </Typography>
              </>
            )}
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
            <ViewingStatusBadge status={status} />
            {viewing.status === 'CANCELLED' && viewing.cancelledBy && (
              <Typography variant="caption" color="textSecondary">
                {t(`viewing:card.cancelledBy.${viewing.cancelledBy}`)}
              </Typography>
            )}
          </div>
        </div>

        {audience === 'owner' && viewing.tenant && !hideListing && (
          <div className="flex items-center gap-2.5">
            <InitialsAvatar
              id={viewing.tenant.id}
              firstName={viewing.tenant.firstName}
              lastName={viewing.tenant.lastName}
              size="sm"
            />
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <Typography variant="subtitle2" component="p">
                {`${viewing.tenant.firstName} ${viewing.tenant.lastName}`}
              </Typography>
              <TenantContacts email={viewing.tenant.email} phone={viewing.tenant.phone} />
            </div>
          </div>
        )}
        {audience === 'owner' && viewing.tenant && hideListing && (
          <TenantContacts email={viewing.tenant.email} phone={viewing.tenant.phone} />
        )}
        {address && (
          <Typography
            variant="body2"
            component="p"
            className="inline-flex items-center gap-1.5 text-primary"
          >
            <PlaceOutlined aria-hidden fontSize="small" />
            <span className="sr-only">{t('viewing:card.address')} </span>
            <span className="text-text-primary">{address}</span>
          </Typography>
        )}
        {(viewing.message || viewing.note) && (
          <div className="flex flex-col gap-1 rounded-md bg-background px-3 py-2">
            {viewing.message && (
              <Typography variant="body2" color="textSecondary" className="whitespace-pre-line">
                {t(audience === 'owner' ? 'viewing:card.theirNote' : 'viewing:card.yourNote', {
                  note: viewing.message,
                })}
              </Typography>
            )}
            {viewing.note && (
              <Typography variant="body2" className="whitespace-pre-line">
                {t('viewing:card.answerNote', { note: viewing.note })}
              </Typography>
            )}
          </div>
        )}
        {audience === 'tenant' && viewing.status === 'REQUESTED' && upcoming && (
          <Typography variant="caption" color="textSecondary">
            {t('viewing:card.waiting')}
          </Typography>
        )}

        {(ownerActs || tenantActs || canMessage) && (
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
                  {t('viewing:card.confirm')}
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
                  {t('viewing:card.decline')}
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
                {t(
                  audience === 'owner'
                    ? 'viewing:card.messageTenant'
                    : 'viewing:card.messageLister',
                )}
              </Button>
            )}
            {((ownerActs && viewing.status === 'CONFIRMED') || tenantActs) && (
              <Button
                ref={
                  viewing.status === 'CONFIRMED' || audience === 'tenant' ? triggerRef : undefined
                }
                variant="text"
                color="error"
                disabled={decide.isPending}
                onClick={() => {
                  setDialog('cancel');
                }}
                className="sm:ml-auto"
              >
                {t('viewing:card.cancel')}
              </Button>
            )}
          </div>
        )}
        {decide.isError && (
          <Alert
            ref={errorRef}
            tabIndex={-1}
            severity="error"
            role="alert"
            className="outline-none"
          >
            {t(`errors:${decide.error.code}`)}
          </Alert>
        )}
      </div>
      {dialog !== null && (
        <ViewingDecisionDialog
          open
          kind={dialog}
          subject={subject}
          isPending={decide.isPending}
          onCancel={() => {
            setDialog(null);
            triggerRef.current?.focus();
          }}
          onConfirm={(note) => {
            run(dialog, note);
          }}
        />
      )}
    </Card>
  );
}

interface TenantContactsProps {
  email: string;
  phone: string | null;
}

/** The tenant's email and phone as links, on one wrapping line. */
function TenantContacts({ email, phone }: TenantContactsProps) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
      <Link href={`mailto:${email}`} underline="hover" className="inline-flex items-center gap-1">
        <MailOutlined aria-hidden fontSize="inherit" />
        <Typography variant="body2" component="span" className="break-all">
          {email}
        </Typography>
      </Link>
      {phone && (
        <Link href={`tel:${phone}`} underline="hover" className="inline-flex items-center gap-1">
          <PhoneOutlined aria-hidden fontSize="inherit" />
          <Typography variant="body2" component="span" className="app-tabular">
            {phone}
          </Typography>
        </Link>
      )}
    </div>
  );
}
