import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/shared/api/apiError';

export interface MessageErrorProps {
    error: unknown;
    onRetry: () => void;
}

export function MessageError({ error, onRetry }: MessageErrorProps) {
    const { t } = useTranslation(['errors', 'message']);
    return (
        <Alert
            severity="error"
            role="alert"
            action={
                <Button color="inherit" size="small" onClick={onRetry}>
                    {t('message:retry')}
                </Button>
            }
        >
            {t(`errors:${isApiError(error) ? error.code : 'INTERNAL_ERROR'}`)}
        </Alert>
    );
}
