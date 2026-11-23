import type { TFunction } from 'i18next';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import {
    BROWSE_SORTS,
    type BrowseParams,
    DEFAULT_BROWSE_SORT,
    PROPERTY_TYPE_PARAMS,
} from '@/shared/lib/listing-search';
import { formatMoney } from '@/shared/lib/money';
import { trackScrollEdges } from '@/shared/lib/scroll-edges';

import { BATH_FILTER_OPTIONS, BED_FILTER_OPTIONS } from '../schemas';
import type { BrowseFilterChange } from '../types';
import { CityFilterPill } from './city-filter-pill';
import { FilterOptions } from './filter-options';
import { FilterPill } from './filter-pill';
import { PriceFilterForm } from './price-filter-form';

export interface FilterPillRowProps {
    params: BrowseParams;
    drawerCount: number;
    onChange: (change: BrowseFilterChange) => void;
    onOpenDrawer: () => void;
}

/** The price pill's value: a range, a floor or a ceiling, each in the currency's own format (I18N-4). */
const priceLabel = (params: BrowseParams, t: TFunction<'listing'>, locale: string): string | undefined => {
    const money = (amount: string): string => formatMoney({ amount, currency: 'USD' }, locale);
    if (params.priceMin !== undefined && params.priceMax !== undefined) {
        return `${money(params.priceMin)}–${money(params.priceMax)}`;
    }
    if (params.priceMin !== undefined) {
        return t('filters.chip.priceFrom', { min: money(params.priceMin) });
    }
    if (params.priceMax !== undefined) {
        return t('filters.chip.priceTo', { max: money(params.priceMax) });
    }
    return undefined;
};

/**
 * The toolbar's pills: one row that scrolls sideways on a phone with faded edges and wraps from
 * `md` (RESP-4). Each pill applies at once; "More" opens the drawer; on a phone the sort is one
 * more pill, because the select beside the row is hidden there.
 */
export function FilterPillRow({ params, drawerCount, onChange, onOpenDrawer }: FilterPillRowProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const priceValue = priceLabel(params, t, i18n.language);
    return (
        <div
            ref={trackScrollEdges}
            className="app-scroll-fade app-scroll-quiet -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 md:mx-0 md:flex-wrap md:px-0"
        >
            <CityFilterPill
                citySlug={params.city}
                onPick={(city) => {
                    onChange({ city });
                }}
            />
            <FilterPill
                label={params.kind === 'rent' ? t('filters.rent') : t('filters.price')}
                {...(priceValue === undefined ? {} : { value: priceValue })}
            >
                {(close) => <PriceFilterForm filters={params} onApply={onChange} onDone={close} />}
            </FilterPill>
            <FilterPill
                label={t('filters.beds')}
                {...(params.beds === undefined ? {} : { value: t('filters.chip.beds', { count: params.beds }) })}
            >
                {(close) => (
                    <FilterOptions
                        options={['', ...BED_FILTER_OPTIONS]}
                        selected={params.beds === undefined ? '' : String(params.beds)}
                        labelOf={(option) =>
                            option === '' ? t('filters.any') : t('filters.bedsOption', { count: Number(option) })
                        }
                        onPick={(option) => {
                            onChange({ beds: option === '' ? undefined : Number(option) });
                            close();
                        }}
                    />
                )}
            </FilterPill>
            <FilterPill
                label={t('filters.baths')}
                {...(params.baths === undefined ? {} : { value: t('filters.chip.baths', { count: params.baths }) })}
            >
                {(close) => (
                    <FilterOptions
                        options={['', ...BATH_FILTER_OPTIONS]}
                        selected={params.baths ?? ''}
                        labelOf={(option) =>
                            option === '' ? t('filters.any') : t('filters.bathsOption', { count: option })
                        }
                        onPick={(option) => {
                            onChange({ baths: option === '' ? undefined : option });
                            close();
                        }}
                    />
                )}
            </FilterPill>
            <FilterPill
                label={t('filters.type')}
                {...(params.type === undefined ? {} : { value: t(`facts.type.${params.type}`) })}
            >
                {(close) => (
                    <FilterOptions
                        options={['', ...PROPERTY_TYPE_PARAMS]}
                        selected={params.type ?? ''}
                        labelOf={(option) => (option === '' ? t('filters.anyType') : t(`facts.type.${option}`))}
                        onPick={(option) => {
                            onChange({ type: PROPERTY_TYPE_PARAMS.find((candidate) => candidate === option) });
                            close();
                        }}
                    />
                )}
            </FilterPill>
            <FilterPill label={t('filters.more')} badge={drawerCount} onClick={onOpenDrawer}>
                {() => null}
            </FilterPill>
            <div className="md:hidden">
                <FilterPill
                    label={t('browse.sort')}
                    {...(params.sort === DEFAULT_BROWSE_SORT ? {} : { value: t(`browse.sortOptions.${params.sort}`) })}
                >
                    {(close) => (
                        <FilterOptions
                            options={BROWSE_SORTS}
                            selected={params.sort}
                            labelOf={(option) => t(`browse.sortOptions.${option}`)}
                            onPick={(option) => {
                                onChange({ sort: option });
                                close();
                            }}
                        />
                    )}
                </FilterPill>
            </div>
        </div>
    );
}
