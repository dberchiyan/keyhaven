import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { todayUtcIso } from '@/shared/lib/utc-day';

import { groupSecurityEvents } from '../format';
import { useSecurityDayLabel } from '../hooks/use-security-day-label';
import type { SecurityCategory, SecurityLog } from '../types';
import { SecurityEventRow } from './security-event-row';
import { SecurityLogFilter } from './security-log-filter';

const SKELETON_ROWS = ['a', 'b', 'c'] as const;
const SKELETON_ROW_HEIGHT = 56;

export interface SecurityLogViewProps {
    log: UseInfiniteQueryResult<InfiniteData<SecurityLog>, ApiError>;
    category: SecurityCategory | undefined;
    onCategory: (category: SecurityCategory | undefined) => void;
}

/**
 * A security log by day (UTC), alike events from one device folded into one row. Each async state
 * is explicit (ARCH-35); "Show more" appends the next cursor page under what is already read (QRY-5). `now` is
 * taken once per mount, so "minutes ago" does not shift under the reader.
 */
export function SecurityLogView({ log, category, onCategory }: SecurityLogViewProps): ReactElement {
    const { t } = useTranslation('auth');
    const [now] = useState(() => Date.now());
    const today = todayUtcIso();
    const dayLabel = useSecurityDayLabel(today);
    const days = useMemo(() => groupSecurityEvents(log.data?.pages.flatMap((page) => page.content) ?? []), [log.data]);

    const body = (): ReactElement => {
        if (log.isError) {
            return <ErrorState error={log.error} onRetry={() => void log.refetch()} />;
        }
        if (log.isPending) {
            return (
                <div aria-busy="true" className="flex flex-col gap-3">
                    <span className="sr-only">{t('securityLog.loading')}</span>
                    {SKELETON_ROWS.map((row) => (
                        <Skeleton key={row} variant="rounded" height={SKELETON_ROW_HEIGHT} />
                    ))}
                </div>
            );
        }
        if (days.length === 0) {
            return (
                <EmptyState
                    icon={ShieldOutlined}
                    title={category ? t('securityLog.emptyFiltered') : t('securityLog.empty')}
                    hint={category ? t('securityLog.emptyFilteredHint') : t('securityLog.emptyHint')}
                    className="gap-2 py-10"
                />
            );
        }
        return (
            <div aria-busy={log.isFetchingNextPage} className="flex flex-col gap-4">
                {days.map(({ day, groups }) => (
                    <section key={day} aria-label={dayLabel(day)} className="flex flex-col gap-1">
                        <Typography variant="overline" component="h3" color="textSecondary">
                            {dayLabel(day)}
                        </Typography>
                        <ul className="-mx-3 my-0 flex list-none flex-col gap-1 p-0">
                            {groups.map((group) => (
                                <SecurityEventRow key={group.id} group={group} today={today} now={now} />
                            ))}
                        </ul>
                    </section>
                ))}
                {log.hasNextPage && (
                    <Button
                        variant="outlined"
                        className="self-start"
                        disabled={log.isFetchingNextPage}
                        onClick={() => void log.fetchNextPage()}
                    >
                        {log.isFetchingNextPage ? t('securityLog.loadingMore') : t('securityLog.showMore')}
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <SecurityLogFilter category={category} onCategory={onCategory} />
            {body()}
        </div>
    );
}
