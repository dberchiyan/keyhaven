import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useAccess } from '@/features/auth';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { ManagedViewingsSection } from '../components/ManagedViewingsSection';
import { MyViewingsSection } from '../components/MyViewingsSection';

/** `/viewings`: a tenant's own viewings, or the owner's dashboard of them (one route, by role). */
export default function ViewingsPage() {
    const { t } = useTranslation('viewing');
    const can = useAccess();
    const manages = can('viewing.manage');
    useDocumentTitle(manages ? t('manage.pageTitle') : t('mine.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
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
