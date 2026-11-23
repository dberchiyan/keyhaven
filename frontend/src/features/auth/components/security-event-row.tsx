import ExpandLessOutlined from '@mui/icons-material/ExpandLessOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { type ReactElement, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

import type { SecurityEventGroup } from '../format';
import { useSecurityEventSummary } from '../hooks/use-security-event-summary';
import { SecurityEventDetails } from './security-event-details';
import { SecurityTime } from './security-time';

export interface SecurityEventRowProps {
    group: SecurityEventGroup;
    today: string;
    now: number;
}

/**
 * One row of the security log: an event, or alike ones from one device folded together, which
 * open to show each. Critical events get a tinted ground and failures the error tone — always
 * with the words, never colour alone (A11Y-6).
 */
export function SecurityEventRow({ group, today, now }: SecurityEventRowProps): ReactElement {
    const { t } = useTranslation('auth');
    const [isOpen, setIsOpen] = useState(false);
    const listId = useId();
    const summary = useSecurityEventSummary(group);
    const { newest, oldest, count, tone, icon: Icon } = summary;

    return (
        <li
            className={cn(
                'flex flex-col gap-2 rounded-md px-3 py-3',
                tone === 'critical' && 'bg-badge-active-background',
            )}
        >
            <div className="flex items-start gap-4">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-md',
                        tone === 'danger' && 'bg-error-light/30 text-error',
                        tone === 'critical' && 'bg-background-paper text-primary',
                        tone === 'normal' && 'bg-badge-neutral-background text-text-secondary',
                    )}
                >
                    <Icon fontSize="small" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Typography
                            variant="subtitle2"
                            component="span"
                            color={tone === 'danger' ? 'error' : 'textPrimary'}
                        >
                            {summary.title}
                        </Typography>
                        {summary.hasNewDevice && (
                            <Typography
                                variant="caption"
                                component="span"
                                className="rounded-full bg-badge-active-background px-2 text-badge-active-text"
                            >
                                {t('securityLog.isNewDevice')}
                            </Typography>
                        )}
                    </div>
                    <Typography variant="caption" color="textSecondary" className="app-tabular">
                        {[summary.deviceName, newest.ip].filter(Boolean).join(' · ')}
                        {' · '}
                        <SecurityTime
                            from={oldest.occurredAt}
                            to={count > 1 ? newest.occurredAt : undefined}
                            today={today}
                            now={now}
                        />
                    </Typography>
                    {summary.hasRepeatedFailures && (
                        <Typography variant="caption" color="error" className="flex items-center gap-2">
                            <WarningAmberOutlined aria-hidden fontSize="inherit" />
                            {t('securityLog.repeatedFailures', { count })}
                        </Typography>
                    )}
                </div>
                {count > 1 && (
                    <Button
                        size="small"
                        color="inherit"
                        aria-expanded={isOpen}
                        aria-controls={listId}
                        endIcon={isOpen ? <ExpandLessOutlined aria-hidden /> : <ExpandMoreOutlined aria-hidden />}
                        onClick={() => {
                            setIsOpen(!isOpen);
                        }}
                        className="shrink-0"
                    >
                        {isOpen ? t('securityLog.hide') : t('securityLog.show')}
                    </Button>
                )}
            </div>
            {count > 1 && (
                <SecurityEventDetails id={listId} events={group.events} isOpen={isOpen} today={today} now={now} />
            )}
        </li>
    );
}
