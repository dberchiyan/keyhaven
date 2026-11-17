import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormErrorLine, RESERVED_LINE } from '@/features/auth';
import type { SearchFilters } from '@/shared/lib/listingSearch';
import { useSaveSearchForm } from '../hooks/useSaveSearchForm';
import { isSaveSearchValidationMessage, SAVED_SEARCH_LIMITS } from '../schemas';
import { FilterSummary } from './FilterSummary';

export interface SaveSearchDialogProps {
    open: boolean;
    filters: SearchFilters;
    onClose: () => void;
    onSaved: () => void;
}

/** Name the current filters; alerts on by default (a daily email with new matches). */
export function SaveSearchDialog({ open, filters, onClose, onSaved }: SaveSearchDialogProps) {
    const { t } = useTranslation(['savedSearch', 'validation']);
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const titleId = useId();
    const { form, onSubmit, errorCode, errorRef } = useSaveSearchForm(filters, onSaved);
    const { errors, isSubmitting } = form.formState;
    const nameError = errors.name?.message;

    return (
        <Dialog open={open} onClose={onClose} fullScreen={fullScreen} aria-labelledby={titleId}>
            <form noValidate onSubmit={(event) => void onSubmit(event)}>
                <DialogTitle id={titleId}>{t('savedSearch:dialog.title')}</DialogTitle>
                <DialogContent className="flex flex-col gap-3">
                    <Typography variant="body2" color="textSecondary">
                        {t('savedSearch:dialog.text')}
                    </Typography>
                    <FilterSummary filters={filters} />
                    <TextField
                        {...form.register('name')}
                        label={t('savedSearch:dialog.name')}
                        required
                        fullWidth
                        error={Boolean(nameError)}
                        helperText={
                            nameError
                                ? isSaveSearchValidationMessage(nameError)
                                    ? t(nameError, { max: SAVED_SEARCH_LIMITS.name })
                                    : nameError
                                : RESERVED_LINE
                        }
                        slotProps={{ htmlInput: { maxLength: SAVED_SEARCH_LIMITS.name } }}
                    />
                    <Controller
                        control={form.control}
                        name="emailAlerts"
                        render={({ field }) => (
                            <FormControlLabel
                                control={<Switch checked={field.value} onChange={field.onChange} />}
                                label={t('savedSearch:dialog.alerts')}
                            />
                        )}
                    />
                    <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>
                        {t('savedSearch:dialog.cancel')}
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting} aria-busy={isSubmitting}>
                        {t('savedSearch:dialog.save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
