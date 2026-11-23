import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { type ReactElement, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '@/shared/lib/units';

import { useIdleSession } from '../hooks/use-idle-session';

/** `m:ss` left — whole seconds rounded up, so the dialog never shows 0:00 while time remains. */
const countdown = (ms: number): string => {
    const seconds = Math.max(0, Math.ceil(ms / MS_PER_SECOND));
    return `${String(Math.floor(seconds / SECONDS_PER_MINUTE))}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`;
};

/**
 * Two minutes before an idle session ends, a dialog offers "Stay signed in" (NAV-3). The dialog
 * opens on the safe choice, and focus landing on the dialog itself (after a page focused its
 * heading) is handed to that button (A11Y-3); "Stay" re-reads `/auth/me`, which counts as
 * activity.
 */
export function IdleSessionWarning(): ReactElement {
    const { t } = useTranslation('auth');
    const idle = useIdleSession();
    const titleId = useId();
    const textId = useId();
    const stayRef = useRef<HTMLButtonElement>(null);

    return (
        <Dialog
            open={idle.isWarning}
            maxWidth="xs"
            fullWidth
            aria-labelledby={titleId}
            aria-describedby={textId}
            slotProps={{ transition: { onEntered: () => stayRef.current?.focus() } }}
            onFocus={(event) => {
                if (event.target instanceof HTMLElement && !event.target.closest('[role="dialog"]')) {
                    stayRef.current?.focus();
                }
            }}
        >
            <DialogTitle id={titleId}>{t('idle.title')}</DialogTitle>
            <DialogContent>
                <DialogContentText id={textId}>
                    {t('idle.text', { time: countdown(idle.remainingMs) })}
                </DialogContentText>
            </DialogContent>
            <DialogActions className="px-4 py-3 sm:px-6">
                <Button onClick={idle.signOut} disabled={idle.isStaying || idle.isSigningOut}>
                    {t('idle.signOut')}
                </Button>
                <Button ref={stayRef} variant="contained" loading={idle.isStaying} onClick={idle.stay}>
                    {t('idle.stay')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
