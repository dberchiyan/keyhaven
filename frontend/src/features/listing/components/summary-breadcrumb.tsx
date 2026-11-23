import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { browseSearch, fromApiKind } from '@/shared/lib/listing-search';
import { PATHS } from '@/shared/lib/paths';

import type { ListingDetail } from '../types';

export interface SummaryBreadcrumbProps {
    listing: ListingDetail;
}

/** Where the home sits in the catalogue — "Homes • For rent in Austin" — each step a way back to a search. */
export function SummaryBreadcrumb({ listing }: SummaryBreadcrumbProps): ReactElement {
    const { t } = useTranslation('listing');
    const kind = fromApiKind(listing.kind);
    return (
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
                            {t(listing.kind === 'RENT' ? 'detail.breadcrumbRent' : 'detail.breadcrumbSale', {
                                city: listing.city.name,
                            })}
                        </Typography>
                    </Link>
                </li>
            </ol>
        </nav>
    );
}
