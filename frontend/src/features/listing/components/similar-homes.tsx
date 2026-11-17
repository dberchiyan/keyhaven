import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useSimilarListings } from '../hooks/use-listing-queries';
import type { ListingDetail } from '../types';
import { ListingStrip } from './listing-strip';

export interface SimilarHomesProps {
    listing: ListingDetail;
}

/** Homes like this one, from the catalogue; nothing is shown while loading or when there are none. */
export function SimilarHomes({ listing }: SimilarHomesProps): ReactElement {
    const { t } = useTranslation('listing');
    const similar = useSimilarListings(listing.id);
    return (
        <ListingStrip
            id="similar-heading"
            title={t('detail.similar')}
            subtitle={t(listing.kind === 'RENT' ? 'detail.similarNoteRent' : 'detail.similarNoteSale', {
                place: listing.city.name,
            })}
            listings={similar.data ?? []}
        />
    );
}
