import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useId } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { useFieldMessage } from '@/shared/hooks/use-field-message';
import type { SearchFilters } from '@/shared/lib/listing-search';

import { useSaveSearchForm } from '../hooks/use-save-search-form';
import { SAVED_SEARCH_LIMITS } from '../schemas';
import { FilterSummary } from './filter-summary';

export interface SaveSearchDialogProps {
    open: boolean;
    filters: SearchFilters;
    onClose: () => void;
    onSaved: () => void;
}

/**
 * Names the current filters; alerts start on, since a daily email of new matches is why most
 * people save a search. A full-screen sheet on phones (RESP-4).
 */
export function SaveSearchDialog({ open, filters, onClose, onSaved }: SaveSearchDialogProps): ReactElement {
    const { t } = useTranslation('savedSearch');
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const titleId = useId();
    const { form, onSubmit, errorCode, errorRef } = useSaveSearchForm(filters, onSaved);
    const { errors, isSubmitting } = form.formState;
    const fieldMessage = useFieldMessage();

    return (
        <Dialog open={open} onClose={onClose} fullScreen={fullScreen} aria-labelledby={titleId}>
            <form noValidate onSubmit={(event) => void onSubmit(event)}>
                <DialogTitle id={titleId}>{t('dialog.title')}</DialogTitle>
                <DialogContent className="flex flex-col gap-3">
                    <Typography variant="body2" color="textSecondary">
                        {t('dialog.text')}
                    </Typography>
                    <FilterSummary filters={filters} />
                    <TextField
                        {...form.register('name')}
                        label={t('dialog.name')}
                        required
                        fullWidth
                        error={Boolean(errors.name)}
                        helperText={fieldMessage(errors.name, { max: SAVED_SEARCH_LIMITS.name })}
                        slotProps={{ htmlInput: { maxLength: SAVED_SEARCH_LIMITS.name } }}
                    />
                    <Controller
                        control={form.control}
                        name="hasEmailAlerts"
                        render={({ field }) => (
                            <FormControlLabel
                                control={<Switch checked={field.value} onChange={field.onChange} />}
                                label={t('dialog.alerts')}
                            />
                        )}
                    />
                    <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>
                        {t('dialog.cancel')}
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting} aria-busy={isSubmitting}>
                        {t('dialog.save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
