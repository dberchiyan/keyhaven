import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { trackScrollEdges } from '@/shared/lib/scrollEdges';
import type { ListingCard as ListingCardData } from '../types';
import { ListingCard } from './ListingCard';

export interface ListingStripProps {
  id: string;
  title: string;
  subtitle?: string;
  listings: readonly ListingCardData[];
  /** Beside the heading on the right, before the arrows. */
  action?: ReactNode;
  /** A small mark before the title (a clock for "recently viewed"). */
  icon?: ReactNode;
  /** A figure after the title: how many the row holds. */
  caption?: string;
  /**
   * `panel`: the row sits on its own surface (a hairline, a tinted ground, inset padding) and
   * its cards are smaller — a side note next to the page's main grid, not more of it.
   */
  panel?: boolean;
}

/** Sub-pixel widths leave a fraction of a pixel "to scroll" at the ends. */
const SLACK = 1;

/**
 * A short row of cards under a heading — similar homes, recently viewed. One row that scrolls
 * sideways with faded edges on any width (ux.md): a strip, not a grid. A finger swipes it; a
 * mouse has the arrows (and a trackpad scrolls as usual).
 */
export function ListingStrip({
  id,
  title,
  subtitle,
  listings,
  action,
  icon,
  caption,
  panel = false,
}: ListingStripProps) {
  const { t } = useTranslation('listing');
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const measure = (element: HTMLUListElement): void => {
    const next = {
      start: element.scrollLeft > SLACK,
      end: element.scrollLeft + element.clientWidth < element.scrollWidth - SLACK,
    };
    // Only a real change re-renders (the measure runs on every scroll event).
    setEdges((previous) =>
      previous.start === next.start && previous.end === next.end ? previous : next,
    );
  };
  // The edges on mount and whenever the row or the window resizes; scrolling updates them below.
  useEffect(() => {
    const element = listRef.current;
    if (!element) {
      return undefined;
    }
    measure(element);
    const observer = new ResizeObserver(() => {
      measure(element);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [listings.length]);
  // One stable ref callback: keeps the element and lets the edge fades track it (its cleanup stops that).
  const attach = useCallback((element: HTMLUListElement | null) => {
    listRef.current = element;
    return trackScrollEdges(element);
  }, []);
  const scrollBy = (direction: -1 | 1): void => {
    const element = listRef.current;
    if (element) {
      // Most of a view at a time, so the last card seen stays as a landmark.
      element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
    }
  };
  if (listings.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex flex-col gap-3',
        panel && 'rounded-xl border border-divider bg-background-paper/60 p-4 sm:p-5',
      )}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {icon && (
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-badge-active-background text-primary [&_svg]:size-4"
              >
                {icon}
              </span>
            )}
            <Typography id={id} variant="h6" component="h2">
              {title}
            </Typography>
            {caption && (
              <Typography variant="body2" color="textSecondary" className="app-tabular">
                {caption}
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
          {action}
          {/* Arrows for a pointer; on a phone the row is swiped, so they stay out of the way. */}
          <div className="hidden gap-1 md:flex">
            <IconButton
              size="small"
              aria-label={t('strip.previous')}
              disabled={!edges.start}
              onClick={() => {
                scrollBy(-1);
              }}
              className="border border-divider bg-background-paper"
            >
              <ChevronLeftOutlined aria-hidden />
            </IconButton>
            <IconButton
              size="small"
              aria-label={t('strip.next')}
              disabled={!edges.end}
              onClick={() => {
                scrollBy(1);
              }}
              className="border border-divider bg-background-paper"
            >
              <ChevronRightOutlined aria-hidden />
            </IconButton>
          </div>
        </div>
      </div>
      <ul
        ref={attach}
        onScroll={(event) => {
          measure(event.currentTarget);
        }}
        className={cn(
          'app-scroll-fade app-scroll-quiet m-0 flex snap-x list-none gap-4 overflow-x-auto py-1',
          // Bleeds to the page's edges on a phone; from `sm` it stays inside its box.
          panel ? '-mx-4 px-4 sm:mx-0 sm:px-0' : '-mx-4 px-4 md:mx-0 md:px-0',
        )}
      >
        {listings.map((listing) => (
          <li
            key={listing.id}
            className={cn(
              'shrink-0 snap-start',
              // The arbitrary widths: a card and a bit of the next one on a phone; three (panel: four) on a desktop.
              panel ? 'w-[14rem] sm:w-[16rem]' : 'w-[17rem] sm:w-[19rem]',
            )}
          >
            <ListingCard listing={listing} />
          </li>
        ))}
      </ul>
    </section>
  );
}
