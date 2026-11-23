import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';
import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';

import { ManagedViewingsSection } from '../components/managed-viewings-section';
import { MyViewingsSection } from '../components/my-viewings-section';

/** `/viewings`: a tenant's own viewings, or the owner's dashboard of them (one route, by role). */
export function ViewingsPage(): ReactElement {
    const { t } = useTranslation('viewing');
    const { canAccess } = useAccess();
    const manages = canAccess('viewing.manage');
    useDocumentTitle(manages ? t('manage.pageTitle') : t('mine.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <Typography ref={headingRef} tabIndex={-1} variant="h4" component="h1" className="outline-none">
                    {manages ? t('manage.title') : t('mine.title')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {manages ? t('manage.subtitle') : t('mine.subtitle')}
                </Typography>
            </div>
            {manages ? <ManagedViewingsSection /> : <MyViewingsSection />}
        </div>
    );
}
