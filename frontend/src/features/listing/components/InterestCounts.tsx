import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'react-i18next';

export interface InterestCountsProps {
    views: number;
    /** The owner's rows show the saves too; the catalogue card shows the views only. */
    saves?: number;
    className?: string;
}

/**
 * "👁 1,240" (and "♡ 56" for owners) as an icon with a figure: the figure is read out with its
 * noun, the icon is decoration. Inherits the surrounding typography.
 */
export function InterestCounts({ views, saves, className }: InterestCountsProps) {
    const { t, i18n } = useTranslation('listing');
    const format = new Intl.NumberFormat(i18n.language);
    return (
        <span className={['inline-flex items-center gap-3', className].filter(Boolean).join(' ')}>
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
