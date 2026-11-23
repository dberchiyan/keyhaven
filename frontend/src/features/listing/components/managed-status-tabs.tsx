import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import { trackScrollEdges } from '@/shared/lib/scroll-edges';

import { LISTING_STATUSES } from '../hooks/use-managed-listings-params';
import type { ListingStatus, ListingStatusCounts } from '../types';

const ALL = 'ALL';
type StatusTab = ListingStatus | typeof ALL;

export interface ManagedStatusTabsProps {
    status: ListingStatus | undefined;
    counts: ListingStatusCounts | undefined;
    onChange: (status: ListingStatus | undefined) => void;
}

/**
 * Status tabs carrying their counts, so the filter says what it holds; they scroll sideways on a
 * phone (RESP-4). A status nobody has (suspended, for most owners) is not offered unless it is the
 * filter, and pressing the chosen tab again keeps it.
 */
export function ManagedStatusTabs({ status, counts, onChange }: ManagedStatusTabsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const format = new Intl.NumberFormat(i18n.language);
    const countOf = (tab: StatusTab): number | undefined => {
        if (counts === undefined) {
            return undefined;
        }
        return tab === ALL ? LISTING_STATUSES.reduce((sum, key) => sum + counts[key], 0) : counts[tab];
    };
    const tabs = ([ALL, ...LISTING_STATUSES] as const satisfies readonly StatusTab[]).filter(
        (tab) => tab === ALL || tab === status || (countOf(tab) ?? 1) > 0,
    );
    const selectedTab = status ?? ALL;
    return (
        <div ref={trackScrollEdges} className="app-scroll-fade app-scroll-quiet -mx-4 overflow-x-auto px-4">
            <ToggleButtonGroup
                exclusive
                value={selectedTab}
                aria-label={t('manage.filters.status')}
                onChange={(_event, value: string | null) => {
                    if (value !== null) {
                        onChange(LISTING_STATUSES.find((candidate) => candidate === value));
                    }
                }}
            >
                {tabs.map((tab) => {
                    const count = countOf(tab);
                    return (
                        <ToggleButton key={tab} value={tab} className="gap-2">
                            {tab === ALL ? t('manage.filters.all') : t(`status.${tab}`)}
                            {count !== undefined && (
                                <Typography
                                    variant="caption"
                                    component="span"
                                    aria-label={t('manage.filters.count', { count })}
                                    className={cn(
                                        'app-tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5',
                                        selectedTab === tab
                                            ? 'bg-badge-active-background text-badge-active-text'
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
        </div>
    );
}
