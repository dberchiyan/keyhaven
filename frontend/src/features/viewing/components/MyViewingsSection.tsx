import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PATHS } from '@/shared/lib/paths';
import { isUpcoming } from '../format';
import { useOwnViewings } from '../hooks/useViewingQueries';
import { ViewingAgenda } from './ViewingAgenda';
import { ViewingEmpty, ViewingError, ViewingListLoading } from './ViewingListStates';

/** A tenant's viewings: what lies ahead as an agenda by day, then what was answered or passed. */
export function MyViewingsSection() {
  const { t } = useTranslation('viewing');
  const navigate = useNavigate();
  const own = useOwnViewings();
  const [now] = useState(() => Date.now());

  if (own.isPending) {
    return <ViewingListLoading />;
  }
  if (own.isError) {
    return <ViewingError error={own.error} onRetry={() => void own.refetch()} />;
  }
  if (own.data.length === 0) {
    return (
      <ViewingEmpty
        title={t('mine.empty')}
        hint={t('mine.emptyHint')}
        action={{ label: t('mine.browse'), onClick: () => void navigate(PATHS.browse) }}
      />
    );
  }
  const upcoming = own.data
    .filter((viewing) => isUpcoming(viewing, now))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const past = own.data.filter((viewing) => !isUpcoming(viewing, now));
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="viewings-upcoming" className="flex flex-col gap-4">
        <Typography id="viewings-upcoming" variant="h6" component="h2">
          {t('mine.upcoming', { count: upcoming.length })}
        </Typography>
        {upcoming.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            {t('mine.noneUpcoming')}
          </Typography>
        ) : (
          <ViewingAgenda viewings={upcoming} audience="tenant" />
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="viewings-past" className="flex flex-col gap-4">
          <Typography id="viewings-past" variant="h6" component="h2">
            {t('mine.past', { count: past.length })}
          </Typography>
          <ViewingAgenda viewings={past} audience="tenant" />
        </section>
      )}
    </div>
  );
}
