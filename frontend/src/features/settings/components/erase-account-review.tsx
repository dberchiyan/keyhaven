import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';

const EFFECTS = ['signedOut', 'contacts', 'saved', 'viewings', 'messages'] as const;

export interface EraseAccountReviewProps {
    id: string;
}

/**
 * FORM-5: names exactly what erasing does before anything is asked; the landlord line shows only
 * to landlords (an agent's homes belong to the agency and stay). What is kept is said too.
 */
export function EraseAccountReview({ id }: EraseAccountReviewProps): ReactElement {
    const { t } = useTranslation('settings');
    const { canAccess } = useAccess();
    return (
        <div id={id} className="flex flex-col gap-4">
            <Typography variant="body2">{t('data.erase.review.lead')}</Typography>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
                {EFFECTS.map((effect) => (
                    <Typography key={effect} component="li" variant="body2">
                        {t(`data.erase.review.${effect}`)}
                    </Typography>
                ))}
                {canAccess('account.eraseUnpublishes') && (
                    <Typography component="li" variant="body2">
                        {t('data.erase.review.listings')}
                    </Typography>
                )}
            </ul>
            <Typography variant="body2" color="textSecondary">
                {t('data.erase.review.kept')}
            </Typography>
        </div>
    );
}
