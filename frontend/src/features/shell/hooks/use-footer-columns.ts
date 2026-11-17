import { useTranslation } from 'react-i18next';

import { useAccess, useCurrentUser } from '@/features/auth';
import { useCities } from '@/features/listing';
import { browseSearch } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import type { FooterColumn, FooterLink } from '../types';

export const GITHUB_URL = 'https://github.com/dberchiyan/keyhaven';
export const README_URL = `${GITHUB_URL}#readme`;

type LinkKey = 'rent' | 'buy' | 'houses' | 'about' | 'listHome' | 'github';

/**
 * The footer's columns, the same as the landing's footer: Browse, the catalogue's cities (sorted,
 * two columns) and Company; "List your home" goes to the dashboard for someone who already lists.
 */
export const useFooterColumns = (): FooterColumn[] => {
    const { t } = useTranslation('shell');
    const { data: user } = useCurrentUser();
    const { data: cities } = useCities();
    const can = useAccess();
    const link = (key: LinkKey, to: string): FooterLink => ({ key, label: t(`footer.links.${key}`), to });
    const listHome = user && can('home.manage') ? PATHS.home : `${PATHS.signup}?role=landlord`;
    return [
        {
            key: 'browse',
            links: [
                link('rent', `${PATHS.browse}?${browseSearch({ kind: 'rent' })}`),
                link('buy', `${PATHS.browse}?${browseSearch({ kind: 'sale' })}`),
                link('houses', `${PATHS.browse}?${browseSearch({ kind: 'rent', type: 'HOUSE' })}`),
            ],
        },
        {
            key: 'cities',
            hasTwoColumns: true,
            links: [...(cities ?? [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((city) => ({
                    key: city.slug,
                    label: city.name,
                    to: `${PATHS.browse}?${browseSearch({ kind: 'rent', city: city.slug })}`,
                })),
        },
        {
            key: 'company',
            links: [
                { ...link('about', README_URL), isExternal: true },
                link('listHome', listHome),
                { ...link('github', GITHUB_URL), isExternal: true },
            ],
        },
    ];
};
