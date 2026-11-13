import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface DetailSectionProps {
  id: string;
  title: string;
  /** A short note under the title: a caveat or what the block holds. */
  subtitle?: string;
  children: ReactNode;
}

/** A block of the listing page: a heading, an optional note, and a card of rows (`DetailRow`). */
export function DetailSection({ id, title, subtitle, children }: DetailSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
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
      <Card variant="outlined">
        <ul className="m-0 list-none divide-y divide-divider p-0">{children}</ul>
      </Card>
    </section>
  );
}
