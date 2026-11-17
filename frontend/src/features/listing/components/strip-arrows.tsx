import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import IconButton from '@mui/material/IconButton';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { StripEdges } from '../hooks/use-strip-scroll';

export interface StripArrowsProps {
    edges: StripEdges;
    onScroll: (direction: -1 | 1) => void;
}

/** Arrows for a pointer only: on a phone the row is swiped, so they stay out of the way (RESP-4). */
export function StripArrows({ edges, onScroll }: StripArrowsProps): ReactElement {
    const { t } = useTranslation('listing');
    return (
        <div className="hidden gap-1 md:flex">
            <IconButton
                size="small"
                aria-label={t('strip.previous')}
                disabled={!edges.hasMoreStart}
                onClick={() => {
                    onScroll(-1);
                }}
                className="border border-divider bg-background-paper"
            >
                <ChevronLeftOutlined aria-hidden />
            </IconButton>
            <IconButton
                size="small"
                aria-label={t('strip.next')}
                disabled={!edges.hasMoreEnd}
                onClick={() => {
                    onScroll(1);
                }}
                className="border border-divider bg-background-paper"
            >
                <ChevronRightOutlined aria-hidden />
            </IconButton>
        </div>
    );
}
