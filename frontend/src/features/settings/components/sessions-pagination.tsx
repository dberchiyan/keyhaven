import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { SESSIONS_PAGE_SIZE } from '@/features/auth';

export interface SessionsPaginationProps {
    total: number;
    page: number;
    pages: number;
    onPage: (page: number) => void;
}

/** "6–10 of 12" and the pages; the API counts pages from zero, the control from one. */
export function SessionsPagination({ total, page, pages, onPage }: SessionsPaginationProps): ReactElement {
    const { t, i18n } = useTranslation('settings');
    const number = (value: number): string => new Intl.NumberFormat(i18n.language).format(value);
    const from = page * SESSIONS_PAGE_SIZE + 1;
    const to = Math.min(total, from + SESSIONS_PAGE_SIZE - 1);
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3">
            <Typography variant="caption" color="textSecondary" className="app-tabular">
                {t('sessions.range', { from: number(from), to: number(to), count: number(total) })}
            </Typography>
            <Pagination
                shape="rounded"
                color="primary"
                count={pages}
                page={Math.min(page + 1, pages)}
                siblingCount={0}
                aria-label={t('sessions.pages')}
                onChange={(_event, value) => {
                    onPage(value - 1);
                }}
            />
        </div>
    );
}
