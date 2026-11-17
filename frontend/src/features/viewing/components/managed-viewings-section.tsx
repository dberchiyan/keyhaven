import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import Pagination from '@mui/material/Pagination';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { cn } from '@/shared/lib/cn';

import { useManagedViewingsParams } from '../hooks/use-managed-viewings-params';
import { useManagedViewings } from '../hooks/use-viewing-queries';
import { ManagedViewsToggle } from './managed-views-toggle';
import { ViewingAgenda } from './viewing-agenda';
import { ViewingListLoading } from './viewing-list-loading';

/**
 * The owner's viewings dashboard: the views (requests · upcoming · all), then the viewings as an
 * agenda by day, paged. The pagination drops its siblings on a phone — behaviour CSS cannot
 * express, hence the media query (RESP-7).
 */
export function ManagedViewingsSection(): ReactElement {
    const { t } = useTranslation('viewing');
    const can = useAccess();
    const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
    const { params, setView, setPage } = useManagedViewingsParams();
    const page = useManagedViewings(params);

    const renderList = (): ReactElement => {
        if (page.isPending) {
            return <ViewingListLoading />;
        }
        if (page.isError) {
            return <ErrorState error={page.error} onRetry={() => void page.refetch()} />;
        }
        if (page.data.content.length === 0) {
            return (
                <EmptyState
                    icon={EventBusyOutlined}
                    title={t(`manage.empty.${params.view}`)}
                    hint={t(`manage.emptyHint.${params.view}`)}
                    className="py-10"
                />
            );
        }
        const pages = Math.ceil(page.data.totalElements / params.size);
        return (
            <div className={cn('flex flex-col gap-6', page.isPlaceholderData && 'opacity-60')}>
                <ViewingAgenda viewings={page.data.content} audience="owner" canDecide={can('viewing.decide')} />
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
        );
    };

    return (
        <div className="flex flex-col gap-5">
            <ManagedViewsToggle view={params.view} onChange={setView} />
            {renderList()}
        </div>
    );
}
