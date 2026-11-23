import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import { useViewingSummary } from '../hooks/use-viewing-queries';
import { MANAGED_VIEWS, type ManagedView } from '../types';

export interface ManagedViewsToggleProps {
    view: ManagedView;
    onChange: (view: ManagedView) => void;
}

/**
 * The dashboard's views as a segmented control carrying the figures that matter: waiting
 * requests in amber, so they read as work. Three equal cells on a phone, as wide as the labels
 * from `sm`; the count's label says what the figure is (A11Y-7).
 */
export function ManagedViewsToggle({ view, onChange }: ManagedViewsToggleProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const summary = useViewingSummary();
    const format = new Intl.NumberFormat(i18n.language);
    const countOf = (candidate: ManagedView): number | undefined => {
        if (candidate === 'requests') {
            return summary.data?.requested;
        }
        return candidate === 'upcoming' ? summary.data?.upcoming : undefined;
    };

    return (
        <ToggleButtonGroup
            exclusive
            value={view}
            aria-label={t('manage.views.label')}
            onChange={(_event, value: ManagedView | null) => {
                if (value !== null) {
                    onChange(value);
                }
            }}
            className="w-full sm:w-auto sm:self-start"
        >
            {MANAGED_VIEWS.map((candidate) => {
                const count = countOf(candidate);
                return (
                    <ToggleButton key={candidate} value={candidate} className="flex-1 gap-2 sm:flex-none">
                        {t(`manage.views.${candidate}`)}
                        {count !== undefined && (
                            <Typography
                                variant="caption"
                                component="span"
                                aria-label={t(
                                    candidate === 'requests'
                                        ? 'manage.views.requestsCount'
                                        : 'manage.views.upcomingCount',
                                    { count },
                                )}
                                className={cn(
                                    'app-tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5',
                                    candidate === 'requests' && count > 0
                                        ? 'bg-secondary-main text-secondary-contrast-text'
                                        : 'bg-badge-neutral-background text-badge-neutral-text',
                                )}
                            >
                                {format.format(count)}
                            </Typography>
                        )}
                    </ToggleButton>
                );
            })}
        </ToggleButtonGroup>
    );
}
