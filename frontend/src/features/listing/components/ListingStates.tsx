import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/shared/api/apiError';

const SKELETON_CARDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;

/** The grid while it loads: cards in the real shape, so nothing jumps. */
export function ListingGridLoading() {
    const { t } = useTranslation();
    return (
        <div
            role="status"
            aria-busy="true"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
            <span className="sr-only">{t('status.loading')}</span>
            {SKELETON_CARDS.map((id) => (
                <div key={id} aria-hidden className="flex flex-col gap-2">
                    <Skeleton variant="rounded" className="aspect-[4/3] h-auto w-full" />
                    <Skeleton variant="text" className="w-1/3" />
                    <Skeleton variant="text" className="w-3/4" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            ))}
        </div>
    );
}

export interface ListingEmptyProps {
    title: string;
    hint: string;
    action?: { label: string; onClick: () => void };
}

export function ListingEmpty({ title, hint, action }: ListingEmptyProps) {
    return (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <SearchOffOutlined aria-hidden fontSize="large" color="disabled" />
            <Typography variant="h6" component="p">
                {title}
            </Typography>
            <Typography variant="body2" color="textSecondary">
                {hint}
            </Typography>
            {action && (
                <Button variant="outlined" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}

export interface ListingErrorProps {
    error: unknown;
    retryLabel: string;
    onRetry: () => void;
}

export function ListingError({ error, retryLabel, onRetry }: ListingErrorProps) {
    const { t } = useTranslation('errors');
    return (
        <Alert
            severity="error"
            role="alert"
            action={
                <Button color="inherit" size="small" onClick={onRetry}>
                    {retryLabel}
                </Button>
            }
        >
            {t(isApiError(error) ? error.code : 'INTERNAL_ERROR')}
        </Alert>
    );
}
