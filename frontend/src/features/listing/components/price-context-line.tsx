import TrendingDownOutlined from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlined from '@mui/icons-material/TrendingFlatOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';

import type { ListingDetail } from '../types';

export interface PriceContextLineProps {
    listing: ListingDetail;
}

const ABOUT_TYPICAL_PERCENT = 3;

type PriceTone = 'below' | 'typical' | 'above';

const TONE_ICONS = { below: TrendingDownOutlined, typical: TrendingFlatOutlined, above: TrendingUpOutlined } as const;
const TONE_CLASSES: Record<PriceTone, string> = {
    below: 'text-primary',
    typical: 'text-text-secondary',
    above: 'text-secondary',
};

/**
 * The price against comparable homes: "8 % below typical for a house in Wallingford — median
 * $4,100 from 12 homes". Nothing when the catalogue has too few to compare (the API sends null);
 * within ±3 % it reads "about typical", and the direction is in words as well as the arrow (QRY-21).
 */
export function PriceContextLine({ listing }: PriceContextLineProps): ReactElement | null {
    const { t, i18n } = useTranslation('listing');
    const context = listing.priceContext;
    if (!context) {
        return null;
    }
    const place = context.scope === 'NEIGHBORHOOD' && listing.neighborhood ? listing.neighborhood : listing.city.name;
    const type = t(`facts.type.${listing.propertyType}`).toLowerCase();
    const percent = Math.abs(context.differencePercent);
    const tone: PriceTone =
        percent <= ABOUT_TYPICAL_PERCENT ? 'typical' : context.differencePercent < 0 ? 'below' : 'above';
    const Icon = TONE_ICONS[tone];
    return (
        <div className="flex items-start gap-1.5">
            <Icon aria-hidden fontSize="small" className={cn('mt-0.5 shrink-0', TONE_CLASSES[tone])} />
            <Typography variant="body2" component="p">
                <span className={cn(tone === 'below' && 'text-primary')}>
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
