import { useTranslation } from 'react-i18next';
import { StatCard } from '@/shared/components/StatCard';
import { LISTING_STATUSES } from '../hooks/useManagedListingsParams';
import { useManagedListingCounts } from '../hooks/useListingQueries';

/** How many listings the caller manages in each status — four tiles (two columns on phones). */
export function StatusCounts() {
  const { t, i18n } = useTranslation('listing');
  const counts = useManagedListingCounts();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {LISTING_STATUSES.map((status) => (
        <StatCard
          key={status}
          title={t(`manage.counts.${status}`)}
          value={
            counts.data
              ? new Intl.NumberFormat(i18n.language).format(counts.data[status])
              : undefined
          }
        />
      ))}
    </div>
  );
}
