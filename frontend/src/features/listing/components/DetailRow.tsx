import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface DetailRowProps {
  /** An icon in a tinted tile, or a dot (lists of places). */
  icon?: ReactNode;
  marker?: 'dot';
  label: ReactNode;
  /** Right-aligned: a figure, a date, a chip. */
  value?: ReactNode;
  /** A second line under the label (an address's second line, a note). */
  detail?: ReactNode;
}

/** One row of a `DetailSection` card: a mark, the label, and the value on the right. */
export function DetailRow({ icon, marker, label, value, detail }: DetailRowProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      {icon !== undefined && (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-badge-active-background text-primary"
        >
          {icon}
        </span>
      )}
      {marker === 'dot' && (
        <span aria-hidden className="mx-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Typography variant="body1" component="span" className="truncate">
          {label}
        </Typography>
        {detail !== undefined && (
          <Typography variant="body2" color="textSecondary" component="span">
            {detail}
          </Typography>
        )}
      </div>
      {value !== undefined && (
        <Typography
          variant="body1"
          component="span"
          color="textSecondary"
          className={cn('app-tabular shrink-0 text-right', typeof value !== 'string' && 'flex')}
        >
          {value}
        </Typography>
      )}
    </li>
  );
}
