import { useState } from 'react';
import type { SearchFilters } from '@/shared/lib/listingSearch';
import { useListingCount } from './useListingQueries';

/** The filters the drawer edits; the search text and the city stay in the toolbar. */
export const DRAWER_KEYS = [
    'type',
    'priceMin',
    'priceMax',
    'beds',
    'baths',
    'pets',
    'furnished',
    'parking',
    'availableBy',
] as const;
export type DrawerKey = (typeof DRAWER_KEYS)[number];
export type DrawerFilters = Pick<SearchFilters, DrawerKey>;
/** What applying the drawer sends: every key, so a cleared one is removed from the URL. */
export type DrawerChange = { [K in DrawerKey]: DrawerFilters[K] };

export const drawerFiltersOf = (filters: SearchFilters): DrawerFilters =>
    Object.fromEntries(DRAWER_KEYS.flatMap((key) => (filters[key] === undefined ? [] : [[key, filters[key]]])));

/** How many filters are on, the rent range counting as one (it shows as one chip). */
export const countDrawerFilters = (filters: SearchFilters): number =>
    DRAWER_KEYS.filter((key) => key !== 'priceMax' && filters[key] !== undefined).length +
    (filters.priceMin === undefined && filters.priceMax !== undefined ? 1 : 0);

/**
 * A draft of the drawer's filters: edits stay local until "Show homes" applies them all at once,
 * while the button already says how many homes the draft would show. The drawer remounts on each
 * opening, so the draft starts from the URL every time.
 */
export const useFilterDraft = (current: SearchFilters, open: boolean) => {
    const [draft, setDraft] = useState<DrawerFilters>(() => drawerFiltersOf(current));
    const set = <K extends DrawerKey>(key: K, value: DrawerFilters[K]): void => {
        setDraft((previous) => ({ ...previous, [key]: value }));
    };
    const clear = (): void => {
        setDraft({});
    };
    const count = useListingCount(
        {
            kind: current.kind,
            ...(current.q === undefined ? {} : { q: current.q }),
            ...(current.city === undefined ? {} : { city: current.city }),
            ...draft,
        },
        open,
    );
    /** Every drawer key, cleared ones as `undefined`, so applying replaces rather than merges. */
    const change = (): DrawerChange => ({
        type: draft.type,
        priceMin: draft.priceMin,
        priceMax: draft.priceMax,
        beds: draft.beds,
        baths: draft.baths,
        pets: draft.pets,
        furnished: draft.furnished,
        parking: draft.parking,
        availableBy: draft.availableBy,
    });
    return { draft, set, clear, change, count: count.data, counting: count.isFetching };
};
