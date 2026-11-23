import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { ReactElement } from 'react';
import { type Control, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { RESERVED_LINE } from '@/shared/hooks/use-field-message';

import { HORIZON_DAYS, NOTICE_HOURS, type ScheduleOutput, type ScheduleValues, SLOT_MINUTES } from '../schemas';

export interface ScheduleOptionsFieldsProps {
    control: Control<ScheduleValues, unknown, ScheduleOutput>;
}

/** How long a viewing is, the notice and how far ahead — choices only, so each keeps an empty reserved line (FORM-2). */
export function ScheduleOptionsFields({ control }: ScheduleOptionsFieldsProps): ReactElement {
    const { t } = useTranslation('viewing');
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Controller
                control={control}
                name="slotMinutes"
                render={({ field }) => (
                    <TextField
                        select
                        label={t('hours.slot')}
                        value={field.value}
                        onChange={field.onChange}
                        helperText={RESERVED_LINE}
                    >
                        {SLOT_MINUTES.map((option) => (
                            <MenuItem key={option} value={option}>
                                {t('hours.minutes', { count: Number(option) })}
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
                        label={t('hours.notice')}
                        value={field.value}
                        onChange={field.onChange}
                        helperText={RESERVED_LINE}
                    >
                        {NOTICE_HOURS.map((option) => (
                            <MenuItem key={option} value={option}>
                                {Number(option) === 0
                                    ? t('hours.noNotice')
                                    : t('hours.hoursAhead', { count: Number(option) })}
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
                        label={t('hours.horizon')}
                        value={field.value}
                        onChange={field.onChange}
                        helperText={RESERVED_LINE}
                    >
                        {HORIZON_DAYS.map((option) => (
                            <MenuItem key={option} value={option}>
                                {t('hours.daysAhead', { count: Number(option) })}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            />
        </div>
    );
}
