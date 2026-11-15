import Pagination from '@mui/material/Pagination';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { useAccess } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { useManagedViewingsParams } from '../hooks/useManagedViewingsParams';
import { useManagedViewings, useViewingSummary } from '../hooks/useViewingQueries';
import { MANAGED_VIEWS, type ManagedView } from '../types';
import { ViewingAgenda } from './ViewingAgenda';
import { ViewingEmpty, ViewingError, ViewingListLoading } from './ViewingListStates';

/**
 * The owner's viewings dashboard: the views (requests · upcoming · all) as a segmented control
 * with the figures that matter on it, then the viewings as an agenda by day.
 */
export function ManagedViewingsSection() {
  const { t, i18n } = useTranslation('viewing');
  const can = useAccess();
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const { params, setView, setPage } = useManagedViewingsParams();
  const summary = useViewingSummary();
  const page = useManagedViewings(params);
  const total = page.data?.totalElements ?? 0;
  const pages = Math.ceil(total / params.size);
  const format = new Intl.NumberFormat(i18n.language);
  const countOf = (view: ManagedView): number | null =>
    view === 'requests'
      ? (summary.data?.requested ?? null)
      : view === 'upcoming'
        ? (summary.data?.upcoming ?? null)
        : null;

  return (
    <div className="flex flex-col gap-5">
      <ToggleButtonGroup
        exclusive
        value={params.view}
        aria-label={t('manage.views.label')}
        onChange={(_event, value: ManagedView | null) => {
          if (value !== null) {
            setView(value);
          }
        }}
        // On a phone the three views share the whole width equally; from `sm` the control is as
        // wide as its labels.
        className="w-full sm:w-auto sm:self-start"
      >
        {MANAGED_VIEWS.map((view) => {
          const count = countOf(view);
          return (
            <ToggleButton key={view} value={view} className="flex-1 gap-2 sm:flex-none">
              {t(`manage.views.${view}`)}
              {count !== null && (
                <Typography
                  variant="caption"
                  component="span"
                  aria-label={t(
                    view === 'requests'
                      ? 'manage.views.requestsCount'
                      : 'manage.views.upcomingCount',
                    { count },
                  )}
                  className={cn(
                    'app-tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5',
                    view === 'requests' && count > 0
                      ? 'bg-secondary-main text-secondary-contrast-text'
                      : 'bg-badge-neutral-background text-badge-neutral-text',
                  )}
                >
                  {format.format(count)}
                </Typography>
              )}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
      {page.isPending ? (
        <ViewingListLoading />
      ) : page.isError ? (
        <ViewingError error={page.error} onRetry={() => void page.refetch()} />
      ) : page.data.content.length === 0 ? (
        <ViewingEmpty
          title={t(`manage.empty.${params.view}`)}
          hint={t(`manage.emptyHint.${params.view}`)}
        />
      ) : (
        <div className={cn('flex flex-col gap-6', page.isPlaceholderData && 'opacity-60')}>
          <ViewingAgenda
            viewings={page.data.content}
            audience="owner"
            canDecide={can('viewing.decide')}
          />
          {pages > 1 && (
            <Pagination
              siblingCount={isPhone ? 0 : 1}
              boundaryCount={1}
              shape="rounded"
              color="primary"
              count={pages}
              page={Math.min(params.page, pages)}
              aria-label={t('manage.pages')}
              onChange={(_event, value) => {
                setPage(value);
              }}
              className="self-center [&_ul]:justify-center"
            />
          )}
        </div>
      )}
    </div>
  );
}
