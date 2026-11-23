import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiContractError, isApiError } from '@/shared/api/api-error';
import type { ErrorCode } from '@/shared/types';

export interface ErrorStateProps {
    error: unknown;
    onRetry: () => void;
    className?: string;
}

const messageCodeOf = (error: unknown): ErrorCode | 'CONTRACT_MISMATCH' => {
    if (error instanceof ApiContractError) {
        return 'CONTRACT_MISMATCH';
    }
    return isApiError(error) ? error.code : 'INTERNAL_ERROR';
};

/**
 * The error branch of an async view (ARCH-35): the `errors:` message for the code — a contract
 * mismatch says so instead of a generic failure (QRY-14) — and a retry.
 */
export function ErrorState({ error, onRetry, className }: ErrorStateProps): ReactElement {
    const { t } = useTranslation(['errors', 'common']);
    return (
        <Alert
            severity="error"
            role="alert"
            className={className}
            action={
                <Button color="inherit" size="small" onClick={onRetry}>
                    {t('common:actions.retry')}
                </Button>
            }
        >
            {t(`errors:${messageCodeOf(error)}`)}
        </Alert>
    );
}
