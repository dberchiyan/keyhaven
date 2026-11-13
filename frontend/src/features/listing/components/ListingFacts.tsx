import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { formatBaths, formatBeds, formatDay, formatSize } from '../format';
import type { ListingDetail } from '../types';

export interface ListingFactsProps {
  listing: ListingDetail;
}

/** Beds, baths, size, type and availability, then the amenities as chips with words. */
export function ListingFacts({ listing }: ListingFactsProps) {
  const { t, i18n } = useTranslation('listing');
  const rows: [string, string][] = [
    [
      t('detail.rooms'),
      `${formatBeds(listing.bedrooms, t)} · ${formatBaths(listing.bathrooms, t)}`,
    ],
    [t('detail.size'), formatSize(listing.sizeSqft, i18n.language, t)],
    [t('detail.type'), t(`facts.type.${listing.propertyType}`)],
    [
      t('detail.availableFrom'),
      listing.availableFrom ? formatDay(listing.availableFrom, i18n.language) : t('card.forSale'),
    ],
    [t('detail.neighborhood'), listing.neighborhood ?? '—'],
    [t('detail.zip'), listing.zip],
  ];
  // Furnished and pets are a rental's terms; a home for sale shows only the parking.
  const chips = [
    ...(listing.kind === 'RENT'
      ? [
          listing.furnished ? t('facts.furnished') : t('facts.unfurnished'),
          listing.petsAllowed ? t('facts.pets') : t('facts.noPets'),
        ]
      : []),
    listing.parking ? t('facts.parking') : t('facts.noParking'),
  ];
  return (
    <div className="flex flex-col gap-4">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {chips.map((chip) => (
          <li key={chip}>
            <Chip label={chip} variant="outlined" />
          </li>
        ))}
      </ul>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <Typography component="dt" variant="body2" color="textSecondary">
              {label}
            </Typography>
            <Typography component="dd" variant="body2" className="app-tabular m-0">
              {value}
            </Typography>
          </div>
        ))}
      </dl>
    </div>
  );
}
