import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { RESERVED_LINE } from '@/shared/hooks/use-field-message';

import { formatDayHeading } from '../format';
import { useBlockedDayDraft } from '../hooks/use-blocked-day-draft';

export interface BlockedDaysFieldProps {
    blockedDays: readonly string[];
    onChange: (days: string[]) => void;
}

/** Days off: a date field with "Add" and the chosen days as removable chips; its error line is reserved (FORM-2). */
export function BlockedDaysField({ blockedDays, onChange }: BlockedDaysFieldProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const { draft, setDraft, error, add } = useBlockedDayDraft(blockedDays, onChange);
    return (
        <div className="flex flex-col gap-2">
            <Typography variant="subtitle2" component="p">
                {t('hours.blocked')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
                {t('hours.blockedHint')}
            </Typography>
            <div className="flex flex-wrap items-start gap-2">
                <TextField
                    type="date"
                    size="small"
                    label={t('hours.blockedDay')}
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.target.value);
                    }}
                    error={error !== undefined}
                    helperText={error ?? RESERVED_LINE}
                    slotProps={{ inputLabel: { shrink: true } }}
                    className="w-48"
                />
                <Button variant="outlined" onClick={add}>
                    {t('hours.addBlocked')}
                </Button>
            </div>
            {blockedDays.length > 0 && (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {blockedDays.map((day) => (
                        <li key={day}>
                            <Chip
                                label={formatDayHeading(day, i18n.language)}
                                onDelete={() => {
                                    onChange(blockedDays.filter((entry) => entry !== day));
                                }}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
