import CloseOutlined from '@mui/icons-material/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const TIME_STEP_SECONDS = 900;

export interface ScheduleRange {
    start: string;
    end: string;
}

export interface ScheduleRangeRowProps {
    range: ScheduleRange;
    canRemove: boolean;
    onChange: (range: ScheduleRange) => void;
    onRemove: () => void;
}

/** One time range of a weekday; the inputs step by a quarter hour, the finest slot grid the hours need. */
export function ScheduleRangeRow({ range, canRemove, onChange, onRemove }: ScheduleRangeRowProps): ReactElement {
    const { t } = useTranslation('viewing');
    const slotProps = { htmlInput: { step: TIME_STEP_SECONDS }, inputLabel: { shrink: true } };
    return (
        <div className="flex flex-wrap items-center gap-2">
            <TextField
                type="time"
                size="small"
                label={t('hours.from')}
                value={range.start}
                onChange={(event) => {
                    onChange({ ...range, start: event.target.value });
                }}
                slotProps={slotProps}
                className="w-36"
            />
            <TextField
                type="time"
                size="small"
                label={t('hours.to')}
                value={range.end}
                onChange={(event) => {
                    onChange({ ...range, end: event.target.value });
                }}
                slotProps={slotProps}
                className="w-36"
            />
            <IconButton size="small" aria-label={t('hours.removeRange')} disabled={!canRemove} onClick={onRemove}>
                <CloseOutlined fontSize="small" />
            </IconButton>
        </div>
    );
}
