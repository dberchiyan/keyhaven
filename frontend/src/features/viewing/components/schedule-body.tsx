import Skeleton from '@mui/material/Skeleton';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/shared/api/api-error';
import { ErrorState } from '@/shared/components/error-state';

import type { ViewingScheduleState } from '../types';
import { ScheduleWeekSummary } from './schedule-week-summary';

export interface ScheduleBodyProps {
    state: UseQueryResult<ViewingScheduleState, ApiError>;
}

/** The hours' loading, error and summary states (ARCH-35); no hours yet renders nothing, the heading says so. */
export function ScheduleBody({ state }: ScheduleBodyProps): ReactElement | null {
    const { t } = useTranslation('viewing');
    if (state.isPending) {
        return (
            <div role="status" aria-busy="true" className="flex flex-col gap-2">
                <span className="sr-only">{t('hours.loading')}</span>
                <Skeleton variant="text" className="w-1/2" />
                <Skeleton variant="rounded" className="h-24 w-full" />
            </div>
        );
    }
    if (state.isError) {
        return <ErrorState error={state.error} onRetry={() => void state.refetch()} />;
    }
    return state.data.schedule ? <ScheduleWeekSummary schedule={state.data.schedule} /> : null;
}
