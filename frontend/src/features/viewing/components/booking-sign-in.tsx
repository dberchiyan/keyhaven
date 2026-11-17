import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router';

import type { LoginLocationState } from '@/features/auth';
import { PATHS } from '@/shared/lib/paths';

/** A visitor sees the slots but signs in to ask; sign-in brings them back to this section, not the page top. */
export function BookingSignIn(): ReactElement {
    const { t } = useTranslation('viewing');
    const location = useLocation();
    const loginState: LoginLocationState = { from: `${location.pathname}${location.search}#book-viewing` };
    return (
        <div className="flex flex-col gap-2">
            <Button
                component={RouterLink}
                to={PATHS.login}
                state={loginState}
                variant="contained"
                size="large"
                startIcon={<EventAvailableOutlined aria-hidden />}
                className="self-start"
            >
                {t('book.signInToBook')}
            </Button>
            <Typography variant="caption" color="textSecondary">
                {t('book.signInHint')}{' '}
                <Link component={RouterLink} to={PATHS.signup} underline="hover">
                    {t('book.signUpLink')}
                </Link>
            </Typography>
        </div>
    );
}
