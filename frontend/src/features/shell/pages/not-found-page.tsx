import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

/** Any path the router does not know (FE-01 #9): says so and offers the catalogue instead of redirecting silently. */
export function NotFoundPage(): ReactElement {
    const { t } = useTranslation('shell');
    useDocumentTitle(t('notFound.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
            <SearchOffOutlined aria-hidden fontSize="large" color="disabled" />
            <div className="flex flex-col gap-2">
                <Typography ref={headingRef} tabIndex={-1} variant="h4" component="h1" className="outline-none">
                    {t('notFound.title')}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                    {t('notFound.hint')}
                </Typography>
            </div>
            <Button variant="contained" component={RouterLink} to={PATHS.browse}>
                {t('notFound.browse')}
            </Button>
        </div>
    );
}
