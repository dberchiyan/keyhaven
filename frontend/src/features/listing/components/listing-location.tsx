import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ListingDetail } from '../types';
import { DetailRow } from './detail-row';
import { DetailSection } from './detail-section';

export interface ListingLocationProps {
    listing: ListingDetail;
    note?: string;
}

/**
 * City, neighborhood and ZIP for everyone; the exact address only when the API sends it (the owner,
 * the agency, admins, a tenant with a confirmed viewing), so hiding it is never the UI's call (FSEC-8).
 */
export function ListingLocation({ listing, note }: ListingLocationProps): ReactElement {
    const { t } = useTranslation('listing');
    const subtitle = listing.address ? note : t('detail.addressHidden');
    return (
        <DetailSection
            id="location-heading"
            title={t('detail.location')}
            {...(subtitle === undefined ? {} : { subtitle })}
        >
            {listing.address && (
                <DetailRow
                    marker="dot"
                    label={listing.address.line1}
                    {...(listing.address.line2 ? { detail: listing.address.line2 } : {})}
                    value={t('detail.address')}
                />
            )}
            {listing.neighborhood && (
                <DetailRow marker="dot" label={listing.neighborhood} value={t('detail.neighborhood')} />
            )}
            <DetailRow marker="dot" label={`${listing.city.name}, ${listing.city.state}`} value={t('detail.city')} />
            <DetailRow marker="dot" label={listing.zip} value={t('detail.zip')} />
        </DetailSection>
    );
}
