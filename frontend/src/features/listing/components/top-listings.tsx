import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ManagedInsights } from '../types';
import { TopListingRow } from './top-listing-row';

export interface TopListingsProps {
    rows: ManagedInsights['top'];
}

/** The homes that drew the most interest in the window, ranked against the busiest one. */
export function TopListings({ rows }: TopListingsProps): ReactElement {
    const { t } = useTranslation('listing');
    const peakViews = rows[0]?.views ?? 0;
    return (
        <section aria-labelledby="insights-top-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Typography id="insights-top-heading" variant="h6" component="h3">
                    {t('insights.top')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {t('insights.topHint')}
                </Typography>
            </div>
            {rows.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                    {t('insights.topEmpty')}
                </Typography>
            ) : (
                <ol className="m-0 flex list-none flex-col p-0">
                    {rows.map((row, index) => (
                        <TopListingRow key={row.listing.id} row={row} rank={index + 1} peakViews={peakViews} />
                    ))}
                </ol>
            )}
        </section>
    );
}
