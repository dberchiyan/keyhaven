import Pagination from '@mui/material/Pagination';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { useAccess } from '@/features/auth';
import { StatCard } from '@/shared/components/StatCard';
import { cn } from '@/shared/lib/cn';
import { useManagedViewingsParams } from '../hooks/useManagedViewingsParams';
import { useManagedViewings, useViewingSummary } from '../hooks/useViewingQueries';
import { MANAGED_VIEWS, type ManagedView } from '../types';
import { ViewingCard } from './ViewingCard';
import { ViewingEmpty, ViewingError, ViewingListLoading } from './ViewingListStates';

/**
 * The owner's viewings dashboard: requests waiting and confirmed ahead as figures, a view
 * toggle (requests · upcoming · all) in the URL, and the page of cards with the actions.
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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title={t('manage.summary.requested')}
          value={summary.data ? format.format(summary.data.requested) : undefined}
        />
        <StatCard
          title={t('manage.summary.upcoming')}
          value={summary.data ? format.format(summary.data.upcoming) : undefined}
        />
      </div>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={params.view}
        aria-label={t('manage.views.label')}
        onChange={(_event, value: ManagedView | null) => {
          if (value !== null) {
            setView(value);
          }
        }}
        className="self-start"
      >
        {MANAGED_VIEWS.map((view) => (
          <ToggleButton key={view} value={view} className="normal-case">
            {t(`manage.views.${view}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {page.isPending ? (
        <ViewingListLoading />
      ) : page.isError ? (
        <ViewingError error={page.error} onRetry={() => void page.refetch()} />
      ) : page.data.content.length === 0 ? (
        <ViewingEmpty
          title={t(`manage.empty.${params.view}`)}
          {...(params.view === 'all' ? { hint: t('manage.emptyHint') } : {})}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <ul
            className={cn(
              'm-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2',
              page.isPlaceholderData && 'opacity-60',
            )}
          >
            {page.data.content.map((viewing) => (
              <li key={viewing.id}>
                <ViewingCard viewing={viewing} audience="owner" canDecide={can('viewing.decide')} />
              </li>
            ))}
          </ul>
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
