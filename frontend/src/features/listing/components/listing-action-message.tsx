import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import type { ReactElement, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import type { ApiError } from '@/shared/api/api-error';
import { settingsPath } from '@/shared/lib/paths';

import type { ListingTransition } from '../types';

const OUTCOME_TEXT = {
    publish: 'managed.done.published',
    unpublish: 'managed.done.unpublished',
    suspend: 'managed.done.suspended',
} as const;

export interface ListingActionMessageProps {
    ref: Ref<HTMLDivElement>;
    error: ApiError | null;
    transition: ListingTransition | undefined;
    onDismiss: () => void;
}

/**
 * What a status change did, focused when it appears (A11Y-3): an error stays until the next try, a success can be
 * dismissed; an unverified address gets the way to verify it instead of the bare error.
 */
export function ListingActionMessage({ ref, error, transition, onDismiss }: ListingActionMessageProps): ReactElement {
    const { t } = useTranslation(['listing', 'errors']);
    const text = (): ReactElement | string | null => {
        if (error?.code === 'EMAIL_NOT_VERIFIED') {
            return (
                <>
                    {t('listing:managed.verifyToPublish')}{' '}
                    <Link component={RouterLink} to={settingsPath('account')}>
                        {t('listing:managed.verifyLink')}
                    </Link>
                </>
            );
        }
        if (error) {
            return t(`errors:${error.code}`);
        }
        return transition ? t(`listing:${OUTCOME_TEXT[transition]}`) : null;
    };
    return (
        <Alert
            ref={ref}
            tabIndex={-1}
            severity={error ? 'error' : 'success'}
            role={error ? 'alert' : 'status'}
            className="outline-none"
            onClose={error ? undefined : onDismiss}
        >
            {text()}
        </Alert>
    );
}
