import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';

export interface FilterSectionProps {
    title: string;
    children: ReactNode;
}

/** One titled group of the filter drawer. */
export function FilterSection({ title, children }: FilterSectionProps): ReactElement {
    return (
        <div className="flex flex-col gap-2">
            <Typography variant="subtitle2" component="h3">
                {title}
            </Typography>
            {children}
        </div>
    );
}
