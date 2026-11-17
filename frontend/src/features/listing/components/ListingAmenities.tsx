import LocalParkingOutlined from '@mui/icons-material/LocalParkingOutlined';
import PetsOutlined from '@mui/icons-material/PetsOutlined';
import WeekendOutlined from '@mui/icons-material/WeekendOutlined';
import Chip from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import type { ListingDetail } from '../types';
import { DetailRow } from './DetailRow';
import { DetailSection } from './DetailSection';

export interface ListingAmenitiesProps {
    listing: ListingDetail;
}

/** Yes or no as a chip: filled mint for what the home offers, quiet for what it does not. */
function Answer({ yes, label }: { yes: boolean; label: string }) {
    return (
        <Chip
            size="small"
            label={label}
            className={
                yes
                    ? 'bg-badge-active-background text-badge-active-text'
                    : 'bg-badge-neutral-background text-badge-neutral-text'
            }
        />
    );
}

/** Pets and furnishing (a rental's terms) and the parking; a home for sale shows the parking only. */
export function ListingAmenities({ listing }: ListingAmenitiesProps) {
    const { t } = useTranslation('listing');
    const forRent = listing.kind === 'RENT';
    return (
        <DetailSection
            id="amenities-heading"
            title={t('detail.amenities')}
            subtitle={forRent ? t('detail.amenitiesNote') : t('detail.amenitiesNoteSale')}
        >
            {forRent && (
                <DetailRow
                    icon={<PetsOutlined fontSize="small" />}
                    label={t('detail.pets')}
                    value={
                        <Answer
                            yes={listing.petsAllowed}
                            label={listing.petsAllowed ? t('detail.petsYes') : t('detail.petsNo')}
                        />
                    }
                />
            )}
            {forRent && (
                <DetailRow
                    icon={<WeekendOutlined fontSize="small" />}
                    label={t('detail.furnished')}
                    value={
                        <Answer
                            yes={listing.furnished}
                            label={listing.furnished ? t('detail.furnishedYes') : t('detail.furnishedNo')}
                        />
                    }
                />
            )}
            <DetailRow
                icon={<LocalParkingOutlined fontSize="small" />}
                label={t('detail.parking')}
                value={
                    <Answer
                        yes={listing.parking}
                        label={listing.parking ? t('detail.parkingYes') : t('detail.parkingNo')}
                    />
                }
            />
        </DetailSection>
    );
}
