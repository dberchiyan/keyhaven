import AddCommentOutlined from '@mui/icons-material/AddCommentOutlined';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';
import { BrandMark } from '@/shared/components/brand-mark';

import { INBOX_FILTERS, type InboxFilter } from '../hooks/use-inbox-filter';

export interface InboxHeaderProps {
    total: number | undefined;
    unreadTotal: number;
    filter: InboxFilter;
    onFilterChange: (filter: InboxFilter) => void;
    onWriteToKeyhaven: () => void;
}

/**
 * The inbox's heading with the count, the All / Unread switch and, for members, a pinned "Write to
 * Keyhaven" entry: a contact with the brand's mark rather than a generic "+ New" button, so it says
 * who reads it — the staff has no one to ask.
 */
export function InboxHeader({
    total,
    unreadTotal,
    filter,
    onFilterChange,
    onWriteToKeyhaven,
}: InboxHeaderProps): ReactElement {
    const { t, i18n } = useTranslation('message');
    const { canAccess } = useAccess();
    const format = new Intl.NumberFormat(i18n.language);
    return (
        <div className="flex flex-col gap-2 border-b border-divider px-3 py-2.5">
            <Typography variant="subtitle1" component="h2" className="app-tabular flex items-baseline gap-2">
                {t('inbox.title')}
                {total !== undefined && (
                    <Typography variant="caption" component="span" color="textSecondary">
                        {format.format(total)}
                    </Typography>
                )}
            </Typography>
            <ToggleButtonGroup
                exclusive
                size="small"
                value={filter}
                aria-label={t('inbox.filterLabel')}
                onChange={(_event, value: InboxFilter | null) => {
                    if (value !== null) {
                        onFilterChange(value);
                    }
                }}
                className="w-full"
            >
                {INBOX_FILTERS.map((option) => (
                    <ToggleButton key={option} value={option} className="flex-1 gap-2">
                        {t(`inbox.filter.${option}`)}
                        {option === 'unread' && unreadTotal > 0 && (
                            <Typography
                                variant="caption"
                                component="span"
                                aria-hidden
                                className="app-tabular inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-primary-contrast-text"
                            >
                                {format.format(unreadTotal)}
                            </Typography>
                        )}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
            {canAccess('message.start') && (
                <button
                    type="button"
                    onClick={onWriteToKeyhaven}
                    className="app-hover-fade flex w-full cursor-pointer items-center gap-2 rounded-md border border-divider bg-background px-2.5 py-2 text-left text-inherit outline-offset-2 hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-primary"
                >
                    <BrandMark className="size-9" />
                    <span className="flex min-w-0 flex-1 flex-col">
                        <Typography variant="subtitle2" component="span">
                            {t('inbox.support.title')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" className="truncate">
                            {t('inbox.support.hint')}
                        </Typography>
                    </span>
                    <AddCommentOutlined aria-hidden fontSize="small" className="shrink-0 text-primary" />
                </button>
            )}
        </div>
    );
}
