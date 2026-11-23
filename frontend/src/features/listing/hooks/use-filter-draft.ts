import { useState } from 'react';

import type { SearchFilters } from '@/shared/lib/listing-search';

import { useListingCount } from './use-listing-queries';

export const DRAWER_KEYS = [
    'type',
    'priceMin',
    'priceMax',
    'beds',
    'baths',
    'isPetFriendly',
    'isFurnished',
    'hasParking',
    'moveInOn',
] as const;
export type DrawerKey = (typeof DRAWER_KEYS)[number];
export type DrawerFilters = Pick<SearchFilters, DrawerKey>;
export type DrawerChange = { [K in DrawerKey]: DrawerFilters[K] };

export const drawerFiltersOf = (filters: SearchFilters): DrawerFilters =>
    Object.fromEntries(DRAWER_KEYS.flatMap((key) => (filters[key] === undefined ? [] : [[key, filters[key]]])));

/** How many drawer filters are on — the price range counts once, because it shows as one chip. */
export const countDrawerFilters = (filters: SearchFilters): number =>
    DRAWER_KEYS.filter((key) => key !== 'priceMax' && filters[key] !== undefined).length +
    (filters.priceMin === undefined && filters.priceMax !== undefined ? 1 : 0);

export interface UseFilterDraftResult {
    draft: DrawerFilters;
    set: <K extends DrawerKey>(key: K, value: DrawerFilters[K]) => void;
    clear: () => void;
    change: () => DrawerChange;
    count: number | undefined;
    isCounting: boolean;
}

/**
 * A draft of the drawer's filters (amenities, price, rooms, move-in — the toolbar keeps the text
 * and the city): edits stay local until "Show homes" applies them all at once, while the button
 * already says how many homes the draft would show. The drawer remounts on each opening, so the
 * draft starts from the URL every time (ARCH-33). Applying sends every key, cleared ones as
 * `undefined`, so it replaces rather than merges.
 */
export const useFilterDraft = (current: SearchFilters, open: boolean): UseFilterDraftResult => {
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
    const change = (): DrawerChange => ({
        type: draft.type,
        priceMin: draft.priceMin,
        priceMax: draft.priceMax,
        beds: draft.beds,
        baths: draft.baths,
        isPetFriendly: draft.isPetFriendly,
        isFurnished: draft.isFurnished,
        hasParking: draft.hasParking,
        moveInOn: draft.moveInOn,
    });
    return { draft, set, clear, change, count: count.data, isCounting: count.isFetching };
};
