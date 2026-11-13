import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { trackScrollEdges } from '@/shared/lib/scrollEdges';
import type { ListingCard as ListingCardData } from '../types';
import { ListingCard } from './ListingCard';

export interface ListingStripProps {
  id: string;
  title: string;
  subtitle?: string;
  listings: readonly ListingCardData[];
  /** Beside the heading on the right (a link to see them all). */
  action?: ReactNode;
}

/**
 * A short row of cards under a heading — similar homes, recently viewed. One row that scrolls
 * sideways with faded edges on any width (ux.md): a strip, not a grid, so it never competes
 * with the page's main list.
 */
export function ListingStrip({ id, title, subtitle, listings, action }: ListingStripProps) {
  if (listings.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <Typography id={id} variant="h6" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </div>
        {action}
      </div>
      <ul
        ref={trackScrollEdges}
        className="app-scroll-fade app-scroll-quiet m-0 -mx-4 flex snap-x list-none gap-4 overflow-x-auto px-4 py-1 md:mx-0 md:px-0"
      >
        {listings.map((listing) => (
          <li key={listing.id} className="w-[17rem] shrink-0 snap-start sm:w-[19rem]">
            {/* The arbitrary widths: a card and a bit of the next one on a phone, three on a desktop. */}
            <ListingCard listing={listing} />
          </li>
        ))}
      </ul>
    </section>
  );
}
