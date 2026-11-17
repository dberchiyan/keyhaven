import EditCalendarOutlined from '@mui/icons-material/EditCalendarOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { type ReactElement, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/shared/components/error-state';

import { zoneName } from '../format';
import { useRemoveSchedule, useViewingSchedule } from '../hooks/use-viewing-queries';
import { CloseHoursDialog } from './close-hours-dialog';
import { ScheduleEditor } from './schedule-editor';
import { ScheduleWeekSummary } from './schedule-week-summary';

export interface ScheduleSectionProps {
    listingId: string;
    readOnly: boolean;
}

/**
 * On a listing's management page: the viewing hours as they stand with "Edit hours" and "Close
 * hours", or the invitation to open them. A showcase or suspended listing, or a role that does
 * not set hours, sees them read-only. The editor remounts per opening (ARCH-33) and focus
 * returns to "Edit hours" when it closes (A11Y-3).
 */
export function ScheduleSection({ listingId, readOnly }: ScheduleSectionProps): ReactElement {
    const { t, i18n } = useTranslation(['viewing', 'errors']);
    const state = useViewingSchedule(listingId);
    const remove = useRemoveSchedule();
    const [editing, setEditing] = useState(0);
    const [closing, setClosing] = useState(false);
    const [saved, setSaved] = useState(false);
    const editRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const schedule = state.data?.schedule ?? undefined;
    const timeZone = state.data?.timeZone ?? 'UTC';

    const renderBody = (): ReactElement | undefined => {
        if (state.isPending) {
            return (
                <div role="status" aria-busy="true" className="flex flex-col gap-2">
                    <span className="sr-only">{t('viewing:hours.loading')}</span>
                    <Skeleton variant="text" className="w-1/2" />
                    <Skeleton variant="rounded" className="h-24 w-full" />
                </div>
            );
        }
        if (state.isError) {
            return <ErrorState error={state.error} onRetry={() => void state.refetch()} />;
        }
        return schedule ? <ScheduleWeekSummary schedule={schedule} /> : undefined;
    };

    return (
        <Card variant="outlined" component="section" aria-labelledby="hours-heading">
            <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                        <Typography id="hours-heading" variant="h6" component="h2">
                            {t('viewing:hours.title')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {schedule
                                ? t('viewing:hours.summary', {
                                      minutes: schedule.slotMinutes,
                                      notice: schedule.noticeHours,
                                      days: schedule.horizonDays,
                                      zone: zoneName(timeZone, i18n.language, 'long'),
                                  })
                                : t('viewing:hours.none')}
                        </Typography>
                    </div>
                    {state.data && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                ref={editRef}
                                variant={schedule ? 'outlined' : 'contained'}
                                startIcon={<EditCalendarOutlined aria-hidden />}
                                disabled={readOnly}
                                onClick={() => {
                                    setSaved(false);
                                    setEditing((count) => count + 1);
                                }}
                            >
                                {schedule ? t('viewing:hours.edit') : t('viewing:hours.open')}
                            </Button>
                            {schedule && (
                                <Button
                                    ref={closeRef}
                                    variant="text"
                                    color="error"
                                    disabled={readOnly || remove.isPending}
                                    onClick={() => {
                                        setClosing(true);
                                    }}
                                >
                                    {t('viewing:hours.close')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                {renderBody()}
                {saved && (
                    <Alert
                        severity="success"
                        role="status"
                        onClose={() => {
                            setSaved(false);
                        }}
                    >
                        {t('viewing:hours.saved')}
                    </Alert>
                )}
                {remove.isError && (
                    <Alert severity="error" role="alert">
                        {t(`errors:${remove.error.code}`)}
                    </Alert>
                )}
            </CardContent>
            {editing > 0 && state.data && (
                <ScheduleEditor
                    key={editing}
                    open
                    listingId={listingId}
                    timeZone={timeZone}
                    schedule={schedule}
                    onClose={() => {
                        setEditing(0);
                        editRef.current?.focus();
                    }}
                    onSaved={() => {
                        setEditing(0);
                        setSaved(true);
                        editRef.current?.focus();
                    }}
                />
            )}
            <CloseHoursDialog
                open={closing}
                isPending={remove.isPending}
                onCancel={() => {
                    setClosing(false);
                    closeRef.current?.focus();
                }}
                onConfirm={() => {
                    remove.mutate(listingId, {
                        onSuccess: () => {
                            setClosing(false);
                            editRef.current?.focus();
                        },
                    });
                }}
            />
        </Card>
    );
}
