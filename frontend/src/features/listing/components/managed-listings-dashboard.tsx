import AddOutlined from '@mui/icons-material/AddOutlined';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { useAccess, useCurrentUser } from '@/features/auth';
import { useDocumentTitle } from '@/shared/hooks/use-document-title';
import { usePageHeadingFocus } from '@/shared/hooks/use-page-heading-focus';
import { PATHS } from '@/shared/lib/paths';

import { useDashboardHeading } from '../hooks/use-dashboard-heading';
import { AttentionStrip } from './attention-strip';
import { InsightsPanel } from './insights-panel';
import { ManagedListingsSection } from './managed-listings-section';
import { ShowcaseNotice } from './showcase-notice';

/**
 * The owner's home (ARCH-36: title and heading focus): the figures in the subtitle, what waits for
 * them, then the listings — the page's subject; the interest block comes after it, a second look
 * rather than the first.
 */
export function ManagedListingsDashboard(): ReactElement {
    const { t } = useTranslation('listing');
    useDocumentTitle(t('manage.pageTitle'));
    const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
    const user = useCurrentUser().data;
    const { canAccess } = useAccess();
    const { title, summary } = useDashboardHeading();
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                    <Typography ref={headingRef} tabIndex={-1} variant="h4" component="h1" className="outline-none">
                        {title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" className="app-tabular">
                        {summary}
                    </Typography>
                </div>
                {canAccess('listing.create') && (
                    <Button
                        component={RouterLink}
                        to={PATHS.newListing}
                        variant="contained"
                        startIcon={<AddOutlined aria-hidden />}
                        className="shrink-0 self-start"
                    >
                        {t('manage.new')}
                    </Button>
                )}
            </div>
            {user?.isDemoMode && <ShowcaseNotice scope="dashboard" />}
            <AttentionStrip />
            <ManagedListingsSection />
            <InsightsPanel />
        </div>
    );
}
