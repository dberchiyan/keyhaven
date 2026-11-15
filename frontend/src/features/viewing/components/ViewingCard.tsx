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
import { listingPath, managedListingPath } from '@/shared/lib/paths';
import { displayStatus, formatSlot, formatSlotTime, isUpcoming, zoneName } from '../format';
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
  /** The home's title is already the page's heading: skip the link line. */
  hideListing?: boolean;
}

/**
 * One viewing: the home (cover, title, place), when (in the home's zone), the status, the
 * notes both sides wrote, who asked (the owner's side), the address (the tenant's side once
 * confirmed), and the actions the role still has for it.
 */
export function ViewingCard({
  viewing,
  audience,
  canDecide = true,
  onChanged,
  hideListing,
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
  const when = `${formatSlot(viewing.startsAt, zone, i18n.language)} – ${formatSlotTime(viewing.endsAt, zone, i18n.language)} ${zoneName(zone, i18n.language)}`;
  const place = [
    viewing.listing.neighborhood,
    `${viewing.listing.city.name}, ${viewing.listing.city.state}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const subject = `${viewing.listing.title} — ${formatSlot(viewing.startsAt, zone, i18n.language)}`;
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

  return (
    <Card
      variant="outlined"
      component="article"
      aria-label={subject}
      className="flex flex-col gap-3 p-4"
    >
      <div className="flex gap-3">
        {!hideListing && (
          <div className="size-16 shrink-0 overflow-hidden rounded-md bg-badge-neutral-background">
            {viewing.listing.coverPhotoUrl && (
              <img
                src={viewing.listing.coverPhotoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                width={128}
                height={128}
                className="size-full object-cover"
              />
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {!hideListing && (
            <Typography variant="subtitle1" component="h3" className="line-clamp-2">
              <Link component={RouterLink} to={to} underline="hover" color="inherit">
                {viewing.listing.title}
              </Link>
            </Typography>
          )}
          <Typography variant="body2" className="app-tabular">
            {when}
          </Typography>
          {!hideListing && (
            <Typography variant="body2" color="textSecondary" className="truncate">
              {place}
            </Typography>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ViewingStatusBadge status={status} />
            {viewing.status === 'CANCELLED' && viewing.cancelledBy && (
              <Typography variant="caption" color="textSecondary">
                {t(`viewing:card.cancelledBy.${viewing.cancelledBy}`)}
              </Typography>
            )}
          </div>
        </div>
      </div>

      {audience === 'owner' && viewing.tenant && (
        <div className="bg-background-default flex flex-col gap-1 rounded-lg px-3 py-2">
          <Typography variant="subtitle2" component="p">
            {t('viewing:card.tenant', {
              name: `${viewing.tenant.firstName} ${viewing.tenant.lastName}`,
            })}
          </Typography>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link
              href={`mailto:${viewing.tenant.email}`}
              underline="hover"
              className="inline-flex items-center gap-1"
            >
              <MailOutlined aria-hidden fontSize="inherit" />
              <Typography variant="body2" component="span" className="break-all">
                {viewing.tenant.email}
              </Typography>
            </Link>
            {viewing.tenant.phone && (
              <Link
                href={`tel:${viewing.tenant.phone}`}
                underline="hover"
                className="inline-flex items-center gap-1"
              >
                <PhoneOutlined aria-hidden fontSize="inherit" />
                <Typography variant="body2" component="span" className="app-tabular">
                  {viewing.tenant.phone}
                </Typography>
              </Link>
            )}
          </div>
        </div>
      )}

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
      {audience === 'tenant' && viewing.listing.address && (
        <div className="flex items-start gap-2">
          <PlaceOutlined aria-hidden fontSize="small" className="mt-0.5 text-primary" />
          <Typography variant="body2">
            <span className="sr-only">{t('viewing:card.address')} </span>
            {[viewing.listing.address.line1, viewing.listing.address.line2]
              .filter(Boolean)
              .join(', ')}
          </Typography>
        </div>
      )}
      {audience === 'tenant' && viewing.status === 'REQUESTED' && upcoming && (
        <Typography variant="caption" color="textSecondary">
          {t('viewing:card.waiting')}
        </Typography>
      )}

      {(ownerActs || tenantActs) && (
        <div className="flex flex-wrap gap-2">
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
          {((ownerActs && viewing.status === 'CONFIRMED') || tenantActs) && (
            <Button
              ref={viewing.status === 'CONFIRMED' || audience === 'tenant' ? triggerRef : undefined}
              variant="text"
              color="error"
              disabled={decide.isPending}
              onClick={() => {
                setDialog('cancel');
              }}
            >
              {t('viewing:card.cancel')}
            </Button>
          )}
        </div>
      )}
      {decide.isError && (
        <Alert ref={errorRef} tabIndex={-1} severity="error" role="alert" className="outline-none">
          {t(`errors:${decide.error.code}`)}
        </Alert>
      )}
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
