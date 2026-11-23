import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** The "New" line above what was unread on opening; a labelled separator, so a screen reader names it. */
export function NewMessagesDivider(): ReactElement {
    const { t } = useTranslation('message');
    return (
        <div role="separator" aria-label={t('thread.newLabel')} className="flex items-center gap-2">
            <span aria-hidden className="h-px flex-1 bg-primary/40" />
            <Typography
                variant="caption"
                component="span"
                className="rounded-full bg-badge-active-background px-2 py-0.5 text-badge-active-text"
            >
                {t('thread.new')}
            </Typography>
            <span aria-hidden className="h-px flex-1 bg-primary/40" />
        </div>
    );
}
