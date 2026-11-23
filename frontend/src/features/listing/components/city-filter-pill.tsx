import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useCities } from '../hooks/use-listing-queries';
import { FilterPill } from './filter-pill';

export interface CityFilterPillProps {
    citySlug: string | undefined;
    onPick: (citySlug: string | undefined) => void;
}

/** The city pill: every city of the catalogue, or all of them; the URL keeps the slug. */
export function CityFilterPill({ citySlug, onPick }: CityFilterPillProps): ReactElement {
    const { t } = useTranslation('listing');
    const cities = useCities();
    const city = cities.data?.find((candidate) => candidate.slug === citySlug);
    return (
        <FilterPill label={t('browse.city')} {...(city ? { value: city.name } : {})}>
            {(close) => (
                <MenuList dense autoFocusItem>
                    <MenuItem
                        selected={citySlug === undefined}
                        onClick={() => {
                            onPick(undefined);
                            close();
                        }}
                    >
                        {t('browse.allCities')}
                    </MenuItem>
                    {(cities.data ?? []).map((option) => (
                        <MenuItem
                            key={option.id}
                            selected={option.slug === citySlug}
                            onClick={() => {
                                onPick(option.slug);
                                close();
                            }}
                        >
                            {`${option.name}, ${option.state}`}
                        </MenuItem>
                    ))}
                </MenuList>
            )}
        </FilterPill>
    );
}
