import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { managedListingPath } from '@/shared/lib/paths';
import { formatAvailability, formatBaths, formatBeds, formatPrice } from '../format';
import type { ManagedListingCard } from '../types';
import { InterestCounts } from './InterestCounts';
import { ListingStatusBadge } from './ListingStatusBadge';
import { ShowcaseBadge } from './ShowcaseBadge';

/** Fixed widths, so columns never jump between pages and filters; the place sits under the title. */
const COLUMNS = [
    { key: 'home', width: 'w-[38%]' },
    { key: 'price', width: 'w-[12%]' },
    { key: 'size', width: 'w-[14%]' },
    { key: 'available', width: 'w-[15%]' },
    { key: 'interest', width: 'w-[11%]' },
    { key: 'status', width: 'w-[10%]' },
] as const;

export interface ManagedListingTableProps {
    listings: readonly ManagedListingCard[];
}

/** Desktop and tablet: one row per listing; the title is a stretched link that opens it. */
export function ManagedListingTable({ listings }: ManagedListingTableProps) {
    const { t, i18n } = useTranslation('listing');
    return (
        <Table className="table-fixed">
            <caption className="sr-only">{t('manage.table.caption')}</caption>
            <TableHead>
                <TableRow>
                    {COLUMNS.map((column) => (
                        <TableCell key={column.key} scope="col" className={column.width}>
                            {t(`manage.table.${column.key}`)}
                        </TableCell>
                    ))}
                    <TableCell scope="col" className="w-12">
                        <span className="sr-only">{t('manage.table.open')}</span>
                    </TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {listings.map((listing) => (
                    <TableRow key={listing.id} hover className="group relative">
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="size-12 shrink-0 overflow-hidden rounded-md bg-badge-neutral-background">
                                    {listing.coverPhotoUrl && (
                                        <img
                                            src={listing.coverPhotoUrl}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            width={96}
                                            height={96}
                                            className="size-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <Typography variant="subtitle2" component="span" className="block truncate">
                                        <Link
                                            to={managedListingPath(listing.id)}
                                            aria-label={t('manage.open', { title: listing.title })}
                                            // Stretched link: the whole row opens the listing; the title stays the <a>.
                                            className="text-inherit no-underline after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-primary"
                                        >
                                            {listing.title}
                                        </Link>
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" className="block truncate">
                                        {[listing.neighborhood, `${listing.city.name}, ${listing.city.state}`]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </Typography>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="app-tabular whitespace-nowrap">
                            {formatPrice(listing, i18n.language, t)}
                        </TableCell>
                        <TableCell className="app-tabular whitespace-nowrap">
                            {`${formatBeds(listing.bedrooms, t)} · ${formatBaths(listing.bathrooms, t)}`}
                        </TableCell>
                        <TableCell className="app-tabular whitespace-nowrap">
                            {formatAvailability(listing, i18n.language, t)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            <InterestCounts
                                views={listing.viewCount}
                                saves={listing.saveCount}
                                {...(listing.status === 'PUBLISHED' ? {} : { className: 'text-text-secondary' })}
                            />
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-wrap gap-1">
                                <ListingStatusBadge status={listing.status} />
                                {listing.demo && <ShowcaseBadge />}
                            </div>
                        </TableCell>
                        <TableCell align="right" className="pl-0">
                            {/* The row's affordance: it is a link; the chevron says so and brightens on hover. */}
                            <ChevronRightOutlined
                                aria-hidden
                                fontSize="small"
                                className="text-text-secondary transition-colors group-hover:text-text-primary"
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
