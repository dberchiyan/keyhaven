import EditCalendarOutlined from '@mui/icons-material/EditCalendarOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDayHeading, formatMinutes, WEEKDAY_ORDER, weekdayName, zoneName } from '../format';
import { useRemoveSchedule, useViewingSchedule } from '../hooks/useViewingQueries';
import { ScheduleEditor } from './ScheduleEditor';
import { ViewingError } from './ViewingListStates';

export interface ScheduleSectionProps {
    listingId: string;
    /** A showcase or suspended listing, or a role that does not set hours: shown, not editable. */
    readOnly: boolean;
}

/**
 * On a listing's management page: the viewing hours as they stand (slot, notice, horizon, the
 * week, the days off) with "Edit hours" and "Close hours", or the invitation to open them.
 */
export function ScheduleSection({ listingId, readOnly }: ScheduleSectionProps) {
    const { t, i18n } = useTranslation(['viewing', 'errors']);
    const state = useViewingSchedule(listingId);
    const remove = useRemoveSchedule();
    const [editing, setEditing] = useState(0);
    const [closing, setClosing] = useState(false);
    const [saved, setSaved] = useState(false);
    const editRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const closeTitleId = useId();
    const closeTextId = useId();

    useEffect(() => {
        if (closing) {
            requestAnimationFrame(() => {
                cancelRef.current?.focus();
            });
        }
    }, [closing]);

    const schedule = state.data?.schedule ?? null;
    const timeZone = state.data?.timeZone ?? 'UTC';

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
                {state.isPending ? (
                    <div role="status" aria-busy="true" className="flex flex-col gap-2">
                        <span className="sr-only">{t('viewing:hours.loading')}</span>
                        <Skeleton variant="text" className="w-1/2" />
                        <Skeleton variant="rounded" className="h-24 w-full" />
                    </div>
                ) : state.isError ? (
                    <ViewingError error={state.error} onRetry={() => void state.refetch()} />
                ) : schedule ? (
                    <div className="flex flex-col gap-3">
                        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                            {WEEKDAY_ORDER.map((weekday) => {
                                const windows = schedule.windows
                                    .filter((window) => window.weekday === weekday)
                                    .sort((left, right) => left.start - right.start);
                                return (
                                    <div key={weekday} className="contents">
                                        <Typography component="dt" variant="body2" color="textSecondary">
                                            {weekdayName(weekday, i18n.language, 'short')}
                                        </Typography>
                                        <Typography component="dd" variant="body2" className="app-tabular m-0">
                                            {windows.length === 0
                                                ? t('viewing:hours.closed')
                                                : windows
                                                      .map(
                                                          (window) =>
                                                              `${formatMinutes(window.start, i18n.language)} – ${formatMinutes(window.end, i18n.language)}`,
                                                      )
                                                      .join(' · ')}
                                        </Typography>
                                    </div>
                                );
                            })}
                        </dl>
                        {schedule.blockedDays.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <Typography variant="body2" color="textSecondary">
                                    {t('viewing:hours.blockedList')}
                                </Typography>
                                <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                                    {schedule.blockedDays.map((day) => (
                                        <li key={day}>
                                            <Chip size="small" label={formatDayHeading(day, i18n.language)} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : null}
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
            <Dialog
                open={closing}
                onClose={
                    remove.isPending
                        ? undefined
                        : () => {
                              setClosing(false);
                          }
                }
                aria-labelledby={closeTitleId}
                aria-describedby={closeTextId}
            >
                <DialogTitle id={closeTitleId}>{t('viewing:hours.closeTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText id={closeTextId}>{t('viewing:hours.closeText')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        ref={cancelRef}
                        disabled={remove.isPending}
                        onClick={() => {
                            setClosing(false);
                            closeRef.current?.focus();
                        }}
                    >
                        {t('viewing:hours.closeCancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        loading={remove.isPending}
                        onClick={() => {
                            remove.mutate(listingId, {
                                onSuccess: () => {
                                    setClosing(false);
                                    editRef.current?.focus();
                                },
                            });
                        }}
                    >
                        {t('viewing:hours.closeConfirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}
