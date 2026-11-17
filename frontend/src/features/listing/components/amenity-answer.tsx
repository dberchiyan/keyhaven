import Chip from '@mui/material/Chip';
import type { ReactElement } from 'react';

export interface AmenityAnswerProps {
    isOffered: boolean;
    label: string;
}

/** Yes or no as a chip — filled mint for what the home offers, quiet for what it does not; the word carries it (A11Y-6). */
export function AmenityAnswer({ isOffered, label }: AmenityAnswerProps): ReactElement {
    return (
        <Chip
            size="small"
            label={label}
            className={
                isOffered
                    ? 'bg-badge-active-background text-badge-active-text'
                    : 'bg-badge-neutral-background text-badge-neutral-text'
            }
        />
    );
}
