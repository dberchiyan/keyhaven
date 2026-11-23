import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { trackScrollEdges } from '@/shared/lib/scroll-edges';

import { isSecurityCategory, SECURITY_CATEGORIES } from '../format';
import type { SecurityCategory } from '../types';

const ALL = 'ALL';

export interface SecurityLogFilterProps {
    category: SecurityCategory | undefined;
    onCategory: (category: SecurityCategory | undefined) => void;
}

/**
 * The log's filter by kind: one row that scrolls sideways with faded edges on a phone (RESP-4);
 * pressing the active option again keeps it (an exclusive group never empties).
 */
export function SecurityLogFilter({ category, onCategory }: SecurityLogFilterProps): ReactElement {
    const { t } = useTranslation('auth');
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div ref={trackScrollEdges} className="app-scroll-fade overflow-x-auto">
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={category ?? ALL}
                    aria-label={t('securityLog.filter')}
                    onChange={(_event, value: unknown) => {
                        if (value !== null) {
                            onCategory(isSecurityCategory(value) ? value : undefined);
                        }
                    }}
                    className="w-max"
                >
                    <ToggleButton value={ALL} className="whitespace-nowrap">
                        {t('securityLog.categories.ALL')}
                    </ToggleButton>
                    {SECURITY_CATEGORIES.map((option) => (
                        <ToggleButton key={option} value={option} className="whitespace-nowrap">
                            {t(`securityLog.categories.${option}`)}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </div>
            <Typography variant="caption" color="textSecondary">
                {t('securityLog.timesInUtc')}
            </Typography>
        </div>
    );
}
