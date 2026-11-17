import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/shared/api/apiError';
import { RowSkeleton } from '@/shared/components/RowSkeleton';

const ROWS = ['a', 'b', 'c'] as const;

export function ViewingListLoading() {
    const { t } = useTranslation();
    return (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">{t('status.loading')}</span>
            {ROWS.map((row) => (
                <RowSkeleton key={row} leading="icon" />
            ))}
        </div>
    );
}

export interface ViewingEmptyProps {
    title: string;
    hint?: string;
    action?: { label: string; onClick: () => void };
}

export function ViewingEmpty({ title, hint, action }: ViewingEmptyProps) {
    return (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <EventBusyOutlined aria-hidden fontSize="large" color="disabled" />
            <Typography variant="h6" component="p">
                {title}
            </Typography>
            {hint && (
                <Typography variant="body2" color="textSecondary">
                    {hint}
                </Typography>
            )}
            {action && (
                <Button variant="outlined" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}

export interface ViewingErrorProps {
    error: unknown;
    onRetry: () => void;
}

export function ViewingError({ error, onRetry }: ViewingErrorProps) {
    const { t } = useTranslation(['errors', 'viewing']);
    return (
        <Alert
            severity="error"
            role="alert"
            action={
                <Button color="inherit" size="small" onClick={onRetry}>
                    {t('viewing:list.retry')}
                </Button>
            }
        >
            {t(`errors:${isApiError(error) ? error.code : 'INTERNAL_ERROR'}`)}
        </Alert>
    );
}
