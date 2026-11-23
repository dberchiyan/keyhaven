import LocalParkingOutlined from '@mui/icons-material/LocalParkingOutlined';
import PetsOutlined from '@mui/icons-material/PetsOutlined';
import WeekendOutlined from '@mui/icons-material/WeekendOutlined';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ListingDetail } from '../types';
import { AmenityAnswer } from './amenity-answer';
import { DetailRow } from './detail-row';
import { DetailSection } from './detail-section';

export interface ListingAmenitiesProps {
    listing: ListingDetail;
}

/** Pets and furnishing (a rental's terms) and the parking; a home for sale shows the parking only. */
export function ListingAmenities({ listing }: ListingAmenitiesProps): ReactElement {
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
                        <AmenityAnswer
                            isOffered={listing.isPetFriendly}
                            label={listing.isPetFriendly ? t('detail.petsYes') : t('detail.petsNo')}
                        />
                    }
                />
            )}
            {forRent && (
                <DetailRow
                    icon={<WeekendOutlined fontSize="small" />}
                    label={t('detail.furnished')}
                    value={
                        <AmenityAnswer
                            isOffered={listing.isFurnished}
                            label={listing.isFurnished ? t('detail.furnishedYes') : t('detail.furnishedNo')}
                        />
                    }
                />
            )}
            <DetailRow
                icon={<LocalParkingOutlined fontSize="small" />}
                label={t('detail.parking')}
                value={
                    <AmenityAnswer
                        isOffered={listing.hasParking}
                        label={listing.hasParking ? t('detail.parkingYes') : t('detail.parkingNo')}
                    />
                }
            />
        </DetailSection>
    );
}
