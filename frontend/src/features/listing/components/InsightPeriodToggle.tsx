import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTranslation } from 'react-i18next';
import { INSIGHT_PERIODS, type InsightPeriod } from '../types';

const isPeriod = (value: unknown): value is InsightPeriod =>
  (INSIGHT_PERIODS as readonly unknown[]).includes(value);

export interface InsightPeriodToggleProps {
  period: InsightPeriod;
  onChange: (period: InsightPeriod) => void;
}

/**
 * 7 / 30 / 90 days — the window of every figure and chart of the insights block. On a phone the
 * three options share the whole width equally; from `sm` the control is as wide as its labels.
 */
export function InsightPeriodToggle({ period, onChange }: InsightPeriodToggleProps) {
  const { t } = useTranslation('listing');
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={period}
      aria-label={t('insights.period')}
      onChange={(_event, value: unknown) => {
        // Clicking the chosen option again keeps it.
        if (isPeriod(value)) {
          onChange(value);
        }
      }}
      className="w-full sm:w-auto"
    >
      {INSIGHT_PERIODS.map((option) => (
        <ToggleButton key={option} value={option} className="flex-1 sm:flex-none">
          {t(`insights.periods.${option}`)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
