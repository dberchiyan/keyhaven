import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { formatMoney } from '@/shared/lib/money';

import type { ListingDetail } from '../types';
import { PriceContextLine } from './price-context-line';
import { SummaryBreadcrumb } from './summary-breadcrumb';
import { SummaryChips } from './summary-chips';
import { SummaryFacts } from './summary-facts';

export interface ListingSummaryCardProps {
    listing: ListingDetail;
    actions?: ReactNode;
}

/**
 * The side card — first on a phone, heading the side column on wide screens (RESP-4), so the
 * price, the place and the actions are the first thing read whatever the width.
 */
export function ListingSummaryCard({ listing, actions }: ListingSummaryCardProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    return (
        <Card variant="outlined" component="section" aria-labelledby="summary-heading">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                <SummaryBreadcrumb listing={listing} />
                <div className="flex flex-col gap-2">
                    <Typography id="summary-heading" variant="h3" component="p" className="app-tabular">
                        {formatMoney(listing.price, i18n.language)}
                        {listing.kind === 'RENT' && (
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
                <SummaryChips listing={listing} />
                <SummaryFacts listing={listing} />
                {actions}
            </CardContent>
        </Card>
    );
}
