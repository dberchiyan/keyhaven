import TrendingDownOutlined from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlined from '@mui/icons-material/TrendingFlatOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/cn';
import type { ListingDetail } from '../types';

export interface PriceContextLineProps {
    listing: ListingDetail;
}

/** Within this many percent of the median the price reads as "about typical". */
const ABOUT_TYPICAL_PERCENT = 3;

/**
 * The price against comparable homes: "8 % below typical for a house in Wallingford — median
 * $4,100 from 12 homes". Nothing when the catalogue has too few to compare (the API sends null).
 */
export function PriceContextLine({ listing }: PriceContextLineProps) {
    const { t, i18n } = useTranslation('listing');
    const context = listing.priceContext;
    if (!context) {
        return null;
    }
    const place = context.scope === 'NEIGHBORHOOD' && listing.neighborhood ? listing.neighborhood : listing.city.name;
    const type = t(`facts.type.${listing.propertyType}`).toLowerCase();
    const percent = Math.abs(context.differencePercent);
    const tone = percent <= ABOUT_TYPICAL_PERCENT ? 'typical' : context.differencePercent < 0 ? 'below' : 'above';
    const Icon = tone === 'below' ? TrendingDownOutlined : tone === 'above' ? TrendingUpOutlined : TrendingFlatOutlined;
    return (
        <div className="flex items-start gap-1.5">
            <Icon
                aria-hidden
                fontSize="small"
                className={cn(
                    'mt-0.5 shrink-0',
                    tone === 'below' ? 'text-primary' : tone === 'above' ? 'text-secondary' : 'text-text-secondary',
                )}
            />
            <Typography variant="body2" component="p">
                <span className={cn('font-medium', tone === 'below' && 'text-primary')}>
                    {t(`detail.priceContext.${tone}`, { percent, type, place })}
                </span>{' '}
                <Typography variant="body2" component="span" color="textSecondary">
                    {t('detail.priceContext.basis', {
                        median: formatMoney(context.median, i18n.language),
                        count: context.sample,
                    })}
                </Typography>
            </Typography>
        </div>
    );
}
