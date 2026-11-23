import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { PATHS } from '@/shared/lib/paths';

import { formatSlot } from '../format';
import type { Viewing } from '../types';
import { ViewingCard } from './viewing-card';

export interface BookedViewingProps {
    viewing: Viewing;
    justBooked: boolean;
    onChanged: () => void;
}

/**
 * A tenant with a live viewing of this home sees it instead of the picker — one live viewing per
 * tenant and home, as the API holds it — with a confirmation right after asking.
 */
export function BookedViewing({ viewing, justBooked, onChanged }: BookedViewingProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    return (
        <div className="flex flex-col gap-4">
            {justBooked && (
                <Alert severity="success" role="status">
                    {t('book.requested', {
                        when: formatSlot(viewing.startsAt, viewing.listing.city.timeZone, i18n.language),
                    })}
                </Alert>
            )}
            <ViewingCard viewing={viewing} audience="tenant" hideListing onChanged={onChanged} />
            <Typography variant="caption" color="textSecondary">
                {t('book.seeAll')}{' '}
                <Link component={RouterLink} to={PATHS.viewings} underline="hover">
                    {t('book.seeAllLink')}
                </Link>
            </Typography>
        </div>
    );
}
