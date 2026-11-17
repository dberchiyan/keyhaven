import BathtubOutlined from '@mui/icons-material/BathtubOutlined';
import BedOutlined from '@mui/icons-material/BedOutlined';
import LocalParkingOutlined from '@mui/icons-material/LocalParkingOutlined';
import PetsOutlined from '@mui/icons-material/PetsOutlined';
import SquareFootOutlined from '@mui/icons-material/SquareFootOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { browseSearch } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import { formatBaths, formatBeds, formatSize } from '../format';
import { useNearbyCount } from '../hooks/use-nearby-count';
import type { ListingDetail } from '../types';

type FactKey = 'beds' | 'size' | 'baths' | 'isPetFriendly' | 'hasParking';

interface Fact {
    key: FactKey;
    icon: ReactNode;
    value: string;
}

export interface SummaryFactsProps {
    listing: ListingDetail;
}

/**
 * Four facts at a glance and how many similar homes are listed nearby — the catalogue's own count
 * minus this home, never an invented figure; the line is `aria-busy` while it counts (A11Y-5).
 */
export function SummaryFacts({ listing }: SummaryFactsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const forRent = listing.kind === 'RENT';
    const nearby = useNearbyCount(listing);
    const place = listing.neighborhood ?? listing.city.name;
    const facts: Fact[] = [
        { key: 'beds', icon: <BedOutlined />, value: formatBeds(listing.bedrooms, t) },
        { key: 'size', icon: <SquareFootOutlined />, value: formatSize(listing.sizeSqft, i18n.language, t) },
        { key: 'baths', icon: <BathtubOutlined />, value: formatBaths(listing.bathrooms, t) },
        forRent
            ? {
                  key: 'isPetFriendly',
                  icon: <PetsOutlined />,
                  value: listing.isPetFriendly ? t('detail.petsYes') : t('detail.petsNo'),
              }
            : {
                  key: 'hasParking',
                  icon: <LocalParkingOutlined />,
                  value: listing.hasParking ? t('detail.parkingYes') : t('detail.parkingNo'),
              },
    ];
    return (
        <div className="flex flex-col rounded-lg bg-background">
            <dl className="m-0 grid grid-cols-4 divide-x divide-divider">
                {facts.map((fact) => (
                    <div key={fact.key} className="flex flex-col items-center gap-1 px-1 py-3 text-center">
                        <dt className="text-primary [&_svg]:size-5">
                            <span className="sr-only">{t(`detail.fact.${fact.key}`)}</span>
                            <span aria-hidden>{fact.icon}</span>
                        </dt>
                        <Typography component="dd" variant="subtitle2" className="app-tabular m-0">
                            {fact.value}
                        </Typography>
                    </div>
                ))}
            </dl>
            <div className="mx-4 flex items-center gap-3 border-t border-divider py-3">
                <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-badge-active-background text-primary"
                >
                    <StorefrontOutlined fontSize="small" />
                </span>
                <Typography variant="body2" color="textSecondary" aria-busy={nearby.others === undefined}>
                    {nearby.others === undefined
                        ? t('detail.nearbyCounting', { place })
                        : t(forRent ? 'detail.nearbyRent' : 'detail.nearbySale', { count: nearby.others, place })}{' '}
                    <Link
                        component={RouterLink}
                        to={`${PATHS.browse}?${browseSearch(nearby.filters)}`}
                        underline="hover"
                    >
                        {t('detail.nearbyLink')}
                    </Link>
                </Typography>
            </div>
        </div>
    );
}
