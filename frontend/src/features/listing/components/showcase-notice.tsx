import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

export interface ShowcaseNoticeProps {
    scope: 'listing' | 'dashboard';
}

/**
 * The public demo's rule, said once and in the open: showcase listings are read-only, anything
 * the person adds is theirs to change, and everything resets at midnight. The disabled actions
 * next to it never have to explain themselves. Text only, across the whole width — the page's
 * own "New listing" button is the way to add one (user decision).
 */
export function ShowcaseNotice({ scope }: ShowcaseNoticeProps): ReactElement {
    const { t } = useTranslation('listing');
    return (
        <Alert severity="info" className="items-center">
            <AlertTitle>{t(`showcase.${scope}.title`)}</AlertTitle>
            {t(`showcase.${scope}.text`)}
        </Alert>
    );
}
