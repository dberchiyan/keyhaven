import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { useStripScroll } from '../hooks/use-strip-scroll';
import type { ListingCard as ListingCardData } from '../types';
import { ListingCard } from './listing-card';
import { StripArrows } from './strip-arrows';

export interface ListingStripProps {
    id: string;
    title: string;
    subtitle?: string;
    listings: readonly ListingCardData[];
    headerAction?: ReactNode;
    titleIcon?: ReactNode;
    countLabel?: string;
    isPanel?: boolean;
}

/**
 * A short row of cards — similar homes, recently viewed — that scrolls sideways with faded edges
 * on every width (RESP-4): a strip, not a grid. As a panel it sits on its own surface with smaller
 * cards, a side note beside the page's grid rather than more of it; the row bleeds to the page's
 * edges on a phone only, because from `sm` the bleed clipped the first card. A card and a bit of
 * the next show on a phone, three (panel: four) on a desktop.
 */
export function ListingStrip({
    id,
    title,
    subtitle,
    listings,
    headerAction,
    titleIcon,
    countLabel,
    isPanel = false,
}: ListingStripProps): ReactElement | null {
    const { edges, attach, measure, scrollBy } = useStripScroll(listings.length);
    if (listings.length === 0) {
        return null;
    }
    return (
        <section
            aria-labelledby={id}
            className={cn(
                'flex flex-col gap-3',
                isPanel && 'rounded-xl border border-divider bg-background-paper/60 p-4 sm:p-5',
            )}
        >
            <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        {titleIcon && (
                            <span
                                aria-hidden
                                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-badge-active-background text-primary [&_svg]:size-4"
                            >
                                {titleIcon}
                            </span>
                        )}
                        <Typography id={id} variant="h6" component="h2">
                            {title}
                        </Typography>
                        {countLabel && (
                            <Typography variant="body2" color="textSecondary" className="app-tabular">
                                {countLabel}
                            </Typography>
                        )}
                    </div>
                    {subtitle && (
                        <Typography variant="body2" color="textSecondary">
                            {subtitle}
                        </Typography>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {headerAction}
                    <StripArrows edges={edges} onScroll={scrollBy} />
                </div>
            </div>
            <ul
                ref={attach}
                onScroll={(event) => {
                    measure(event.currentTarget);
                }}
                className={cn(
                    'app-scroll-fade app-scroll-quiet m-0 flex snap-x list-none gap-4 overflow-x-auto py-1',
                    isPanel ? '-mx-4 px-4 sm:mx-0 sm:px-0' : '-mx-4 px-4 md:mx-0 md:px-0',
                )}
            >
                {listings.map((listing) => (
                    <li
                        key={listing.id}
                        className={cn('shrink-0 snap-start', isPanel ? 'w-56 sm:w-64' : 'w-68 sm:w-76')}
                    >
                        <ListingCard listing={listing} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
