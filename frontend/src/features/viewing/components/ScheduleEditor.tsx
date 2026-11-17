import AddOutlined from '@mui/icons-material/AddOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId, useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormErrorLine, RESERVED_LINE } from '@/features/auth';
import { formatDayHeading, WEEKDAY_ORDER, weekdayName } from '../format';
import { useScheduleForm } from '../hooks/useScheduleForm';
import { HORIZON_DAYS, isScheduleValidationMessage, NOTICE_HOURS, SCHEDULE_LIMITS, SLOT_MINUTES } from '../schemas';
import type { ViewingSchedule } from '../types';

export interface ScheduleEditorProps {
    open: boolean;
    listingId: string;
    timeZone: string;
    schedule: ViewingSchedule | null;
    onClose: () => void;
    onSaved: () => void;
}

/** Time inputs step by a quarter hour: the finest slot grid the hours need. */
const TIME_STEP_SECONDS = 900;

/**
 * The hours as a form: how long a viewing is, the notice, how far ahead, a switch and up to
 * three time ranges per weekday (in the home's zone), and the days off. Remounted per opening
 * (the parent keys it), so it always starts from what is stored.
 */
export function ScheduleEditor({ open, listingId, timeZone, schedule, onClose, onSaved }: ScheduleEditorProps) {
    const { t, i18n } = useTranslation(['viewing', 'validation']);
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
    const titleId = useId();
    const { form, onSubmit, errorCode, errorRef } = useScheduleForm(listingId, schedule, onSaved);
    const { control, watch, setValue, formState } = form;
    const { errors, isSubmitting } = formState;
    const days = watch('days');
    const blockedDays = watch('blockedDays');
    const [newBlockedDay, setNewBlockedDay] = useState('');
    const [blockedError, setBlockedError] = useState<string | null>(null);

    const message = (text: string | undefined, args: Record<string, number> = {}): string =>
        text ? (isScheduleValidationMessage(text) ? t(text, args) : text) : RESERVED_LINE;
    const daysError = errors.days?.root?.message ?? errors.days?.message;
    // RHF keeps a sparse list: only the weekdays with an issue have an entry.
    const dayErrorList: Partial<Record<number, { message?: string | undefined }>> = errors.days ?? {};

    const addBlockedDay = (): void => {
        setBlockedError(null);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newBlockedDay)) {
            setBlockedError(t('validation:schedule.blockedDays.invalid'));
            return;
        }
        if (blockedDays.includes(newBlockedDay)) {
            setBlockedError(t('validation:schedule.blockedDays.duplicate'));
            return;
        }
        if (blockedDays.length >= SCHEDULE_LIMITS.blockedDays) {
            setBlockedError(t('validation:schedule.blockedDays.tooMany', { max: SCHEDULE_LIMITS.blockedDays }));
            return;
        }
        setValue('blockedDays', [...blockedDays, newBlockedDay].sort(), { shouldDirty: true });
        setNewBlockedDay('');
    };

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
                <DialogTitle id={titleId}>
                    {schedule ? t('viewing:hours.editTitle') : t('viewing:hours.openTitle')}
                </DialogTitle>
                <DialogContent className="flex flex-col gap-5">
                    <Typography variant="body2" color="textSecondary">
                        {t('viewing:hours.intro', { zone: timeZone })}
                    </Typography>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Controller
                            control={control}
                            name="slotMinutes"
                            render={({ field }) => (
                                <TextField
                                    select
                                    label={t('viewing:hours.slot')}
                                    value={field.value}
                                    onChange={field.onChange}
                                    helperText={RESERVED_LINE}
                                >
                                    {SLOT_MINUTES.map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {t('viewing:hours.minutes', { count: Number(option) })}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                        <Controller
                            control={control}
                            name="noticeHours"
                            render={({ field }) => (
                                <TextField
                                    select
                                    label={t('viewing:hours.notice')}
                                    value={field.value}
                                    onChange={field.onChange}
                                    helperText={RESERVED_LINE}
                                >
                                    {NOTICE_HOURS.map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {Number(option) === 0
                                                ? t('viewing:hours.noNotice')
                                                : t('viewing:hours.hoursAhead', { count: Number(option) })}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                        <Controller
                            control={control}
                            name="horizonDays"
                            render={({ field }) => (
                                <TextField
                                    select
                                    label={t('viewing:hours.horizon')}
                                    value={field.value}
                                    onChange={field.onChange}
                                    helperText={RESERVED_LINE}
                                >
                                    {HORIZON_DAYS.map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {t('viewing:hours.daysAhead', { count: Number(option) })}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </div>

                    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                        <Typography component="legend" variant="subtitle2" className="mb-1 p-0">
                            {t('viewing:hours.week')}
                        </Typography>
                        {WEEKDAY_ORDER.map((weekday) => {
                            const day = days[weekday];
                            const dayError = dayErrorList[weekday]?.message;
                            if (!day) {
                                return null;
                            }
                            return (
                                <div
                                    key={weekday}
                                    className="flex flex-col gap-1 rounded-lg border border-divider px-3 py-2"
                                >
                                    <div className="flex items-center gap-3">
                                        <Controller
                                            control={control}
                                            name={`days.${weekday}.enabled`}
                                            render={({ field }) => (
                                                <Switch
                                                    checked={field.value}
                                                    onChange={(event) => {
                                                        field.onChange(event.target.checked);
                                                        if (event.target.checked && day.ranges.length === 0) {
                                                            setValue(
                                                                `days.${weekday}.ranges`,
                                                                [{ start: '17:00', end: '19:00' }],
                                                                { shouldDirty: true },
                                                            );
                                                        }
                                                    }}
                                                    slotProps={{
                                                        input: {
                                                            'aria-label': t('viewing:hours.openOn', {
                                                                day: weekdayName(weekday, i18n.language, 'long'),
                                                            }),
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                        <Typography variant="body1" className="w-24 shrink-0">
                                            {weekdayName(weekday, i18n.language, 'long')}
                                        </Typography>
                                        {!day.enabled && (
                                            <Typography variant="body2" color="textSecondary">
                                                {t('viewing:hours.closed')}
                                            </Typography>
                                        )}
                                    </div>
                                    {day.enabled && (
                                        <div className="flex flex-col gap-2 pl-0 sm:pl-14">
                                            {day.ranges.map((range, index) => (
                                                <div
                                                    key={`${weekday}-${index}`}
                                                    className="flex flex-wrap items-center gap-2"
                                                >
                                                    <TextField
                                                        type="time"
                                                        size="small"
                                                        label={t('viewing:hours.from')}
                                                        value={range.start}
                                                        onChange={(event) => {
                                                            const next = day.ranges.map((entry, position) =>
                                                                position === index
                                                                    ? { ...entry, start: event.target.value }
                                                                    : entry,
                                                            );
                                                            setValue(`days.${weekday}.ranges`, next, {
                                                                shouldDirty: true,
                                                            });
                                                        }}
                                                        slotProps={{
                                                            htmlInput: { step: TIME_STEP_SECONDS },
                                                            inputLabel: { shrink: true },
                                                        }}
                                                        className="w-36"
                                                    />
                                                    <TextField
                                                        type="time"
                                                        size="small"
                                                        label={t('viewing:hours.to')}
                                                        value={range.end}
                                                        onChange={(event) => {
                                                            const next = day.ranges.map((entry, position) =>
                                                                position === index
                                                                    ? { ...entry, end: event.target.value }
                                                                    : entry,
                                                            );
                                                            setValue(`days.${weekday}.ranges`, next, {
                                                                shouldDirty: true,
                                                            });
                                                        }}
                                                        slotProps={{
                                                            htmlInput: { step: TIME_STEP_SECONDS },
                                                            inputLabel: { shrink: true },
                                                        }}
                                                        className="w-36"
                                                    />
                                                    <IconButton
                                                        size="small"
                                                        aria-label={t('viewing:hours.removeRange')}
                                                        disabled={day.ranges.length === 1}
                                                        onClick={() => {
                                                            setValue(
                                                                `days.${weekday}.ranges`,
                                                                day.ranges.filter(
                                                                    (_entry, position) => position !== index,
                                                                ),
                                                                { shouldDirty: true },
                                                            );
                                                        }}
                                                    >
                                                        <CloseOutlined fontSize="small" />
                                                    </IconButton>
                                                </div>
                                            ))}
                                            {day.ranges.length < SCHEDULE_LIMITS.windowsPerDay && (
                                                <Button
                                                    size="small"
                                                    variant="text"
                                                    startIcon={<AddOutlined aria-hidden />}
                                                    onClick={() => {
                                                        const last = day.ranges[day.ranges.length - 1];
                                                        setValue(
                                                            `days.${weekday}.ranges`,
                                                            [
                                                                ...day.ranges,
                                                                { start: last?.end ?? '17:00', end: '20:00' },
                                                            ],
                                                            { shouldDirty: true },
                                                        );
                                                    }}
                                                    className="self-start"
                                                >
                                                    {t('viewing:hours.addRange')}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    <Typography variant="caption" color="error" role={dayError ? 'alert' : undefined}>
                                        {message(dayError)}
                                    </Typography>
                                </div>
                            );
                        })}
                        <Typography variant="caption" color="error" role={daysError ? 'alert' : undefined}>
                            {message(daysError)}
                        </Typography>
                    </fieldset>

                    <div className="flex flex-col gap-2">
                        <Typography variant="subtitle2" component="p">
                            {t('viewing:hours.blocked')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {t('viewing:hours.blockedHint')}
                        </Typography>
                        <div className="flex flex-wrap items-start gap-2">
                            <TextField
                                type="date"
                                size="small"
                                label={t('viewing:hours.blockedDay')}
                                value={newBlockedDay}
                                onChange={(event) => {
                                    setNewBlockedDay(event.target.value);
                                    setBlockedError(null);
                                }}
                                error={blockedError !== null}
                                helperText={blockedError ?? RESERVED_LINE}
                                slotProps={{ inputLabel: { shrink: true } }}
                                className="w-48"
                            />
                            <Button variant="outlined" onClick={addBlockedDay} className="mt-0.5">
                                {t('viewing:hours.addBlocked')}
                            </Button>
                        </div>
                        {blockedDays.length > 0 && (
                            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                                {blockedDays.map((day) => (
                                    <li key={day}>
                                        <Chip
                                            label={formatDayHeading(day, i18n.language)}
                                            onDelete={() => {
                                                setValue(
                                                    'blockedDays',
                                                    blockedDays.filter((entry) => entry !== day),
                                                    { shouldDirty: true },
                                                );
                                            }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <FormErrorLine errorRef={errorRef} errorCode={errorCode} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>
                        {t('viewing:hours.cancel')}
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting} aria-busy={isSubmitting}>
                        {t('viewing:hours.save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
