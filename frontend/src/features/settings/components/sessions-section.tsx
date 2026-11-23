import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SESSIONS_PAGE_SIZE, useAccess, useEndOtherSessions, useEndSession, useSessions } from '@/features/auth';
import { ErrorState } from '@/shared/components/error-state';
import { RowSkeleton } from '@/shared/components/row-skeleton';
import { cn } from '@/shared/lib/cn';

import { useSessionsParams } from '../hooks/use-sessions-params';
import { EndOtherSessionsDialog } from './end-other-sessions-dialog';
import { SessionRow } from './session-row';
import { SessionsPagination } from './sessions-pagination';
import { SettingsCard } from './settings-card';

/**
 * This device first, then the others a page at a time; one or all of them can be signed out
 * (closed to the demo's showcase accounts). A page emptied by ending its last session steps back
 * to the last page that still has rows.
 */
export function SessionsSection(): ReactElement {
    const { t } = useTranslation(['settings', 'errors']);
    const { page, setPage: goTo } = useSessionsParams();
    const sessions = useSessions(page);
    const endOne = useEndSession();
    const endOthers = useEndOtherSessions();
    const { canAccess } = useAccess();
    const canEnd = canAccess('account.endSessions');
    const [isConfirming, setIsConfirming] = useState(false);
    const others = sessions.data?.others;
    const total = others?.totalElements ?? 0;
    const pages = Math.max(1, Math.ceil(total / SESSIONS_PAGE_SIZE));
    const failure = endOne.error ?? endOthers.error;

    useEffect(() => {
        if (others && others.content.length === 0 && page > 0) {
            goTo(Math.max(0, pages - 1));
        }
    }, [others, page, pages, goTo]);

    const body = (): ReactElement => {
        if (sessions.isError) {
            return <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />;
        }
        if (sessions.isPending) {
            return (
                <div aria-busy="true" className="flex flex-col divide-y divide-divider">
                    <RowSkeleton leading="icon" trailing={false} />
                    <RowSkeleton leading="icon" trailing={false} />
                </div>
            );
        }
        return (
            <div className="flex flex-col gap-4">
                {failure && <Alert severity="error">{t(`errors:${failure.code}`)}</Alert>}
                {sessions.data.current && (
                    <ul className="m-0 list-none p-0">
                        <SessionRow session={sessions.data.current} isCurrent isEnding={false} />
                    </ul>
                )}
                <div className="flex flex-col gap-2">
                    <Typography variant="overline" component="h3" color="textSecondary">
                        {t('sessions.others', { count: total })}
                    </Typography>
                    {total === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                            {t('sessions.onlyThis')}
                        </Typography>
                    ) : (
                        <ul
                            aria-busy={sessions.isPlaceholderData}
                            className={cn('m-0 list-none p-0', sessions.isPlaceholderData && 'opacity-60')}
                        >
                            {others?.content.map((session) => (
                                <SessionRow
                                    key={session.id}
                                    session={session}
                                    isCurrent={false}
                                    isEnding={endOne.isPending && endOne.variables === session.id}
                                    {...(canEnd
                                        ? {
                                              onEnd: () => {
                                                  endOne.mutate(session.id);
                                              },
                                          }
                                        : {})}
                                />
                            ))}
                        </ul>
                    )}
                </div>
                {pages > 1 && <SessionsPagination total={total} page={page} pages={pages} onPage={goTo} />}
            </div>
        );
    };

    return (
        <SettingsCard
            id="settings-sessions"
            title={t('sessions.title')}
            description={t('sessions.description')}
            action={
                total > 0 &&
                canEnd && (
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                            setIsConfirming(true);
                        }}
                    >
                        {t('sessions.endOthers')}
                    </Button>
                )
            }
        >
            {body()}
            <EndOtherSessionsDialog
                open={isConfirming}
                count={total}
                isPending={endOthers.isPending}
                onCancel={() => {
                    setIsConfirming(false);
                }}
                onConfirm={() => {
                    endOthers.mutate(undefined, {
                        onSuccess: () => {
                            setIsConfirming(false);
                            goTo(0);
                        },
                    });
                }}
            />
        </SettingsCard>
    );
}
