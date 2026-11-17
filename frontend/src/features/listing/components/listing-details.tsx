import BathtubOutlined from '@mui/icons-material/BathtubOutlined';
import BedOutlined from '@mui/icons-material/BedOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SquareFootOutlined from '@mui/icons-material/SquareFootOutlined';
import StraightenOutlined from '@mui/icons-material/StraightenOutlined';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatMoney, fromUnits, toUnits } from '@/shared/lib/money';
import { ISO_DAY_LENGTH } from '@/shared/lib/units';

import { formatBaths, formatBeds, formatDay, formatSize } from '../format';
import type { ListingDetail } from '../types';
import { DetailRow } from './detail-row';
import { DetailSection } from './detail-section';

export interface ListingDetailsProps {
    listing: ListingDetail;
}

/** The price divided by the size, exact in ten-thousandths so no float rounds it (QRY-20). */
const perSquareFoot = (listing: ListingDetail): string =>
    fromUnits(toUnits(listing.price.amount) / BigInt(listing.sizeSqft));

/** The facts block; dates are calendar days in UTC like every day in the app (QRY-22), so the listing day never shifts by zone. */
export function ListingDetails({ listing }: ListingDetailsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const forRent = listing.kind === 'RENT';
    const perSqft = formatMoney({ amount: perSquareFoot(listing), currency: listing.price.currency }, i18n.language);
    return (
        <DetailSection id="details-heading" title={t('detail.details')} subtitle={t('detail.detailsNote')}>
            <DetailRow
                icon={<HomeWorkOutlined fontSize="small" />}
                label={t('detail.type')}
                value={t(`facts.type.${listing.propertyType}`)}
            />
            <DetailRow
                icon={<BedOutlined fontSize="small" />}
                label={t('detail.bedrooms')}
                value={formatBeds(listing.bedrooms, t)}
            />
            <DetailRow
                icon={<BathtubOutlined fontSize="small" />}
                label={t('detail.bathrooms')}
                value={formatBaths(listing.bathrooms, t)}
            />
            <DetailRow
                icon={<SquareFootOutlined fontSize="small" />}
                label={t('detail.size')}
                value={formatSize(listing.sizeSqft, i18n.language, t)}
            />
            <DetailRow
                icon={<StraightenOutlined fontSize="small" />}
                label={forRent ? t('detail.rentPerSqft') : t('detail.pricePerSqft')}
                value={forRent ? t('detail.perSqftMonth', { amount: perSqft }) : perSqft}
            />
            {forRent && listing.availableAt && (
                <DetailRow
                    icon={<CalendarMonthOutlined fontSize="small" />}
                    label={t('detail.moveIn')}
                    value={formatDay(listing.availableAt, i18n.language)}
                />
            )}
            {listing.publishedAt && (
                <DetailRow
                    icon={<ScheduleOutlined fontSize="small" />}
                    label={t('detail.listedOn')}
                    value={formatDay(listing.publishedAt.slice(0, ISO_DAY_LENGTH), i18n.language)}
                />
            )}
        </DetailSection>
    );
}
