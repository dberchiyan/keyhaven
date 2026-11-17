import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

export interface InterestCountsProps {
    views: number;
    saves?: number;
    className?: string;
}

/**
 * Views (and saves, on the owner's rows) as an icon and a figure: the figure is read out with its
 * noun and the icon is decoration (A11Y-7); it inherits the surrounding typography (TYPO-2).
 */
export function InterestCounts({ views, saves, className }: InterestCountsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const format = new Intl.NumberFormat(i18n.language);
    return (
        <span className={cn('inline-flex items-center gap-3', className)}>
            <span className="inline-flex items-center gap-1">
                <VisibilityOutlined aria-hidden fontSize="inherit" />
                <span aria-hidden className="app-tabular">
                    {format.format(views)}
                </span>
                <span className="sr-only">{t('card.views', { count: views })}</span>
            </span>
            {saves !== undefined && (
                <span className="inline-flex items-center gap-1">
                    <FavoriteBorderOutlined aria-hidden fontSize="inherit" />
                    <span aria-hidden className="app-tabular">
                        {format.format(saves)}
                    </span>
                    <span className="sr-only">{t('card.saves', { count: saves })}</span>
                </span>
            )}
        </span>
    );
}
