import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { FormErrorLine } from '@/shared/components/form-error-line';
import { useFieldMessage } from '@/shared/hooks/use-field-message';

import { WEEKDAY_ORDER } from '../format';
import { useScheduleForm } from '../hooks/use-schedule-form';
import type { ViewingSchedule } from '../types';
import { BlockedDaysField } from './blocked-days-field';
import { ScheduleDayRow } from './schedule-day-row';
import { ScheduleOptionsFields } from './schedule-options-fields';

export interface ScheduleEditorProps {
    open: boolean;
    listingId: string;
    timeZone: string;
    schedule: ViewingSchedule | undefined;
    onClose: () => void;
    onSaved: () => void;
}

/**
 * The hours as a form: the options, the week (Monday first) and the days off, saved as one
 * document. Remounted per opening (ARCH-33), so it always starts from what is stored; a sheet on
 * phones (RESP-4). React Hook Form keeps a sparse error list — only weekdays with an issue have an
 * entry — read here by index.
 */
export function ScheduleEditor({
    open,
    listingId,
    timeZone,
    schedule,
    onClose,
    onSaved,
}: ScheduleEditorProps): ReactElement {
    const { t } = useTranslation('viewing');
    const fullScreen = useMediaQuery(useTheme().breakpoints.down('md'));
    const titleId = useId();
    const fieldMessage = useFieldMessage();
    const { form, onSubmit, errorCode, errorRef } = useScheduleForm(listingId, schedule, onSaved);
    const { control, watch, setValue, formState } = form;
    const { errors, isSubmitting } = formState;
    const days = watch('days');
    const daysError = errors.days?.root?.message ?? errors.days?.message;
    const dayErrors: Partial<Record<number, { message?: string | undefined }>> = errors.days ?? {};

    return (
        <Dialog
            open={open}
            onClose={isSubmitting ? undefined : onClose}
            fullScreen={fullScreen}
            fullWidth
            maxWidth="md"
            aria-labelledby={titleId}
        >
            <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex min-h-0 flex-col">
                <DialogTitle id={titleId}>{schedule ? t('hours.editTitle') : t('hours.openTitle')}</DialogTitle>
                <DialogContent className="flex flex-col gap-4">
                    <Typography variant="body2" color="textSecondary">
                        {t('hours.intro', { zone: timeZone })}
                    </Typography>
                    <ScheduleOptionsFields control={control} />
                    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                        <Typography component="legend" variant="subtitle2" className="p-0 pb-2">
                            {t('hours.week')}
                        </Typography>
                        {WEEKDAY_ORDER.map((weekday) => {
                            const day = days[weekday];
                            return day ? (
                                <ScheduleDayRow
                                    key={weekday}
                                    control={control}
                                    weekday={weekday}
                                    day={day}
                                    error={dayErrors[weekday]?.message}
                                    onRangesChange={(ranges) => {
                                        setValue(`days.${weekday}.ranges`, ranges, { shouldDirty: true });
                                    }}
                                />
                            ) : undefined;
                        })}
                        <Typography variant="caption" color="error" role={daysError ? 'alert' : undefined}>
                            {fieldMessage(daysError)}
                        </Typography>
                    </fieldset>
                    <BlockedDaysField
                        blockedDays={watch('blockedDays')}
                        onChange={(blockedDays) => {
                            setValue('blockedDays', blockedDays, { shouldDirty: true });
                        }}
                    />
                    <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>
                        {t('hours.cancel')}
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting} aria-busy={isSubmitting}>
                        {t('hours.save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
