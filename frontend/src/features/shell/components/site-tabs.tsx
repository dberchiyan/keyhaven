import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/shared/lib/cn';
import { type BrowseParams, toBrowseSearchParams } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import type { SiteTab } from '../types';

const TABS: readonly SiteTab[] = ['rent', 'sale', 'houses'];

/**
 * A tab keeps the visitor's search (city, text) and drops what does not carry over: the price
 * range (rents and asking prices differ a hundredfold) and, between Rent and Buy, the type and the
 * rental-only filters.
 */
const tabTarget = (params: BrowseParams, tab: SiteTab): string => {
    const next: BrowseParams =
        tab === 'houses'
            ? { ...params, type: 'HOUSE', page: 1 }
            : {
                  ...params,
                  kind: tab,
                  type: undefined,
                  priceMin: undefined,
                  priceMax: undefined,
                  moveInAt: tab === 'sale' ? undefined : params.moveInAt,
                  isPetFriendly: tab === 'sale' ? undefined : params.isPetFriendly,
                  isFurnished: tab === 'sale' ? undefined : params.isFurnished,
                  page: 1,
              };
    const search = toBrowseSearchParams(next).toString();
    return search ? `${PATHS.browse}?${search}` : PATHS.browse;
};

export interface SiteTabsProps {
    activeTab: SiteTab | undefined;
    params: BrowseParams;
}

/** Rent / Buy / Houses as links (they navigate), drawn as the theme's segmented control (A11Y-1). */
export function SiteTabs({ activeTab, params }: SiteTabsProps): ReactElement {
    const { t } = useTranslation('shell');
    return (
        <ul className="m-0 flex list-none gap-0.5 rounded-full border border-divider bg-background p-0.5">
            {TABS.map((tab) => {
                const isActive = tab === activeTab;
                return (
                    <li key={tab} className="flex">
                        <Link
                            to={tabTarget(params, tab)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'inline-flex min-h-9 flex-1 items-center justify-center rounded-full px-4 no-underline transition-colors hover:text-text-primary',
                                isActive
                                    ? 'bg-primary text-primary-contrast-text hover:text-primary-contrast-text'
                                    : 'text-text-secondary',
                            )}
                        >
                            <Typography variant="subtitle2" component="span">
                                {t(`site.tabs.${tab}`)}
                            </Typography>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
