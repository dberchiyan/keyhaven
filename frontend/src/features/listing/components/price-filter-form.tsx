import Button from '@mui/material/Button';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SearchFilters } from '@/shared/lib/listing-search';

import { FilterAmountField } from './filter-amount-field';

export interface PriceFilterChange {
    priceMin: string | undefined;
    priceMax: string | undefined;
}

export interface PriceFilterFormProps {
    filters: SearchFilters;
    onApply: (change: PriceFilterChange) => void;
    onDone: () => void;
}

/** Min and max in the price pill: typed locally and applied together (the button or Enter), so one search runs, not two. */
export function PriceFilterForm({ filters, onApply, onDone }: PriceFilterFormProps): ReactElement {
    const { t } = useTranslation('listing');
    const [min, setMin] = useState(filters.priceMin ?? '');
    const [max, setMax] = useState(filters.priceMax ?? '');
    return (
        <form
            noValidate
            className="flex flex-col gap-3 p-2"
            onSubmit={(event) => {
                event.preventDefault();
                onApply({ priceMin: min || undefined, priceMax: max || undefined });
                onDone();
            }}
        >
            <div className="flex gap-2">
                <FilterAmountField label={t('filters.priceMin')} value={min} onChange={setMin} className="w-32" />
                <FilterAmountField label={t('filters.priceMax')} value={max} onChange={setMax} className="w-32" />
            </div>
            <div className="flex justify-between gap-2">
                <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                        onApply({ priceMin: undefined, priceMax: undefined });
                        onDone();
                    }}
                >
                    {t('filters.clearOne')}
                </Button>
                <Button type="submit" variant="contained" size="small">
                    {t('filters.apply')}
                </Button>
            </div>
        </form>
    );
}
