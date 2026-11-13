import LockOutlined from '@mui/icons-material/LockOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { ListingDetail } from '../types';

export interface AddressBlockProps {
  listing: ListingDetail;
  /** Shown under the address when it is visible (the owner's view). */
  note?: string;
}

/** The exact address when the caller may see it; otherwise why it is hidden. */
export function AddressBlock({ listing, note }: AddressBlockProps) {
  const { t } = useTranslation('listing');
  const publicPart = `${listing.city.name}, ${listing.city.state} ${listing.zip}`;
  return (
    <section aria-labelledby="address-heading" className="flex flex-col gap-1">
      <Typography id="address-heading" variant="subtitle2" component="h2" color="textSecondary">
        {t('detail.address')}
      </Typography>
      {listing.address ? (
        <div className="flex items-start gap-2">
          <PlaceOutlined aria-hidden fontSize="small" className="mt-0.5 text-text-secondary" />
          <Typography variant="body1" component="address" className="not-italic">
            {listing.address.line1}
            {listing.address.line2 ? `, ${listing.address.line2}` : ''}
            <br />
            {publicPart}
          </Typography>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <LockOutlined aria-hidden fontSize="small" className="mt-0.5 text-text-secondary" />
          <div>
            <Typography variant="body1">{publicPart}</Typography>
            <Typography variant="body2" color="textSecondary">
              {t('detail.addressHidden')}
            </Typography>
          </div>
        </div>
      )}
      {note && listing.address && (
        <Typography variant="caption" color="textSecondary">
          {note}
        </Typography>
      )}
    </section>
  );
}
