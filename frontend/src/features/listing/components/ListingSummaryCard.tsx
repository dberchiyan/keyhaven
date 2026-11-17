import BathtubOutlined from '@mui/icons-material/BathtubOutlined';
import BedOutlined from '@mui/icons-material/BedOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import LocalParkingOutlined from '@mui/icons-material/LocalParkingOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import PetsOutlined from '@mui/icons-material/PetsOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SquareFootOutlined from '@mui/icons-material/SquareFootOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { formatAgo } from '@/shared/lib/formatAgo';
import { browseSearch, fromApiKind } from '@/shared/lib/listingSearch';
import { formatMoney } from '@/shared/lib/money';
import { PATHS } from '@/shared/lib/paths';
import { formatBaths, formatBeds, formatSize } from '../format';
import { useNearbyCount } from '../hooks/useNearbyCount';
import type { ListingDetail } from '../types';
import { PriceContextLine } from './PriceContextLine';

export interface ListingSummaryCardProps {
    listing: ListingDetail;
    /** The call to action under the facts: contact, book, save. */
    actions?: ReactNode;
}

type FactKey = 'beds' | 'size' | 'baths' | 'pets' | 'parking';

interface Fact {
    key: FactKey;
    icon: ReactNode;
    value: string;
}

/**
 * The side card: where the home sits in the catalogue (breadcrumb), the price, the place, when
 * it was listed and by whom, four facts at a glance, how many similar homes are listed nearby
 * (the catalogue's own count), and the actions.
 */
export function ListingSummaryCard({ listing, actions }: ListingSummaryCardProps) {
    const { t, i18n } = useTranslation('listing');
    const forRent = listing.kind === 'RENT';
    const kind = fromApiKind(listing.kind);
    const nearby = useNearbyCount(listing);
    // "Listed 3 days ago" is relative to when the page opened (as the security log does it).
    const [now] = useState(() => Date.now());
    const ago = listing.publishedAt ? formatAgo(listing.publishedAt, now, i18n.language) : null;
    const facts: Fact[] = [
        { key: 'beds', icon: <BedOutlined />, value: formatBeds(listing.bedrooms, t) },
        {
            key: 'size',
            icon: <SquareFootOutlined />,
            value: formatSize(listing.sizeSqft, i18n.language, t),
        },
        { key: 'baths', icon: <BathtubOutlined />, value: formatBaths(listing.bathrooms, t) },
        forRent
            ? {
                  key: 'pets',
                  icon: <PetsOutlined />,
                  value: listing.petsAllowed ? t('detail.petsYes') : t('detail.petsNo'),
              }
            : {
                  key: 'parking',
                  icon: <LocalParkingOutlined />,
                  value: listing.parking ? t('detail.parkingYes') : t('detail.parkingNo'),
              },
    ];
    const place = listing.neighborhood ?? listing.city.name;

    return (
        <Card variant="outlined" component="section" aria-labelledby="summary-heading">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                <nav aria-label={t('detail.breadcrumb')}>
                    <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 p-0">
                        <li>
                            <Link component={RouterLink} to={PATHS.browse} underline="hover" color="textSecondary">
                                <Typography variant="body2" component="span">
                                    {t('detail.breadcrumbHome')}
                                </Typography>
                            </Link>
                        </li>
                        <li aria-hidden>
                            <span className="inline-block size-1 rounded-full bg-text-disabled" />
                        </li>
                        <li>
                            <Link
                                component={RouterLink}
                                to={`${PATHS.browse}?${browseSearch({ kind, city: listing.city.slug })}`}
                                underline="hover"
                                color="textSecondary"
                            >
                                <Typography variant="body2" component="span">
                                    {t(forRent ? 'detail.breadcrumbRent' : 'detail.breadcrumbSale', {
                                        city: listing.city.name,
                                    })}
                                </Typography>
                            </Link>
                        </li>
                    </ol>
                </nav>

                <div className="flex flex-col gap-2">
                    <Typography id="summary-heading" variant="h3" component="p" className="app-tabular">
                        {formatMoney(listing.price, i18n.language)}
                        {forRent && (
                            <Typography variant="h6" component="span" color="textSecondary" className="ml-1">
                                {t('detail.perMonthShort')}
                            </Typography>
                        )}
                    </Typography>
                    <PriceContextLine listing={listing} />
                    <div className="flex items-center gap-1.5">
                        <PlaceOutlined aria-hidden fontSize="small" className="text-primary" />
                        <Typography variant="subtitle1" component="p">
                            {[listing.neighborhood, `${listing.city.name}, ${listing.city.state}`]
                                .filter(Boolean)
                                .join(' · ')}
                        </Typography>
                    </div>
                </div>

                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    <li>
                        <Chip
                            size="small"
                            icon={listing.listedBy.kind === 'AGENCY' ? <BusinessOutlined /> : <PersonOutlineOutlined />}
                            label={listing.listedBy.kind === 'AGENCY' ? listing.listedBy.name : t('detail.landlord')}
                            className="bg-badge-active-background text-badge-active-text [&_.MuiChip-icon]:text-badge-active-text"
                        />
                    </li>
                    {listing.publishedAt && (
                        <li>
                            <Chip
                                size="small"
                                icon={<ScheduleOutlined />}
                                label={ago ? t('detail.listedAgo', { ago }) : t('detail.listedJustNow')}
                                className="bg-badge-neutral-background text-badge-neutral-text [&_.MuiChip-icon]:text-badge-neutral-text"
                            />
                        </li>
                    )}
                </ul>

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
                                : t(forRent ? 'detail.nearbyRent' : 'detail.nearbySale', {
                                      count: nearby.others,
                                      place,
                                  })}{' '}
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

                {actions}
            </CardContent>
        </Card>
    );
}
