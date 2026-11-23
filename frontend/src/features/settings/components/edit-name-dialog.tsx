import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormHelperText from '@mui/material/FormHelperText';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { CurrentUser } from '@/features/auth';
import { RESERVED_LINE, useFieldMessage } from '@/shared/hooks/use-field-message';

import { useEditNameForm } from '../hooks/use-edit-name-form';
import { NAME_LIMITS } from '../schemas';

export interface EditNameDialogProps {
    open: boolean;
    user: CurrentUser;
    onClose: () => void;
    onExited: () => void;
}

/**
 * Renames oneself; closes on success, and the new name shows everywhere because the hook re-reads
 * every query. Full-screen on a phone (RESP-4); closing is blocked while saving.
 */
export function EditNameDialog({ open, user, onClose, onExited }: EditNameDialogProps): ReactElement {
    const { t } = useTranslation(['settings', 'errors']);
    const fieldMessage = useFieldMessage();
    const titleId = useId();
    const textId = useId();
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const { form, onSubmit, errorCode, errorRef } = useEditNameForm(user, onClose);
    const { errors, isSubmitting } = form.formState;

    return (
        <Dialog
            open={open}
            onClose={isSubmitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isPhone}
            aria-labelledby={titleId}
            aria-describedby={textId}
            slotProps={{ transition: { onExited } }}
        >
            <DialogTitle id={titleId}>{t('account.profile.dialog.title')}</DialogTitle>
            <form noValidate className="flex flex-col" onSubmit={(event) => void onSubmit(event)}>
                <DialogContent dividers className="flex flex-col gap-4">
                    <DialogContentText id={textId}>{t('account.profile.dialog.description')}</DialogContentText>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <TextField
                            {...form.register('firstName')}
                            label={t('account.profile.firstName')}
                            autoComplete="given-name"
                            required
                            error={Boolean(errors.firstName)}
                            helperText={fieldMessage(errors.firstName, { max: NAME_LIMITS.firstName })}
                            slotProps={{ htmlInput: { maxLength: NAME_LIMITS.firstName } }}
                        />
                        <TextField
                            {...form.register('lastName')}
                            label={t('account.profile.lastName')}
                            autoComplete="family-name"
                            required
                            error={Boolean(errors.lastName)}
                            helperText={fieldMessage(errors.lastName, { max: NAME_LIMITS.lastName })}
                            slotProps={{ htmlInput: { maxLength: NAME_LIMITS.lastName } }}
                        />
                    </div>
                </DialogContent>
                <DialogActions className="flex-wrap gap-2 px-4 py-3 sm:px-6 sm:py-4">
                    <FormHelperText
                        component="div"
                        role="alert"
                        ref={errorRef}
                        tabIndex={-1}
                        error
                        className="m-0 basis-full outline-none sm:mr-auto sm:basis-auto"
                    >
                        {errorCode ? t(`errors:${errorCode}`) : RESERVED_LINE}
                    </FormHelperText>
                    <Button onClick={onClose} disabled={isSubmitting}>
                        {t('account.profile.dialog.cancel')}
                    </Button>
                    <Button type="submit" variant="contained" loading={isSubmitting}>
                        {t('account.profile.dialog.submit')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
