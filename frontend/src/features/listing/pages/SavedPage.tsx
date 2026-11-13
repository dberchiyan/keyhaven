import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { SavedSearchesSection } from '@/features/saved-search';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { SavedHomesSection } from '../components/SavedHomesSection';

const TABS = ['homes', 'searches'] as const;
type SavedTab = (typeof TABS)[number];

/** A tenant's saved homes and saved searches; the open tab is in the URL (`?tab=`). */
export default function SavedPage() {
  const { t } = useTranslation('listing');
  useDocumentTitle(t('saved.pageTitle'));
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: SavedTab = TABS.find((candidate) => candidate === searchParams.get('tab')) ?? 'homes';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography
          ref={headingRef}
          tabIndex={-1}
          variant="h4"
          component="h1"
          className="outline-none"
        >
          {t('saved.title')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('saved.subtitle')}
        </Typography>
      </div>
      <Tabs
        value={tab}
        onChange={(_event, value: SavedTab) => {
          // A new tab starts from its first page.
          setSearchParams(value === 'homes' ? {} : { tab: value });
        }}
        aria-label={t('saved.tabs')}
      >
        {TABS.map((candidate) => (
          <Tab
            key={candidate}
            value={candidate}
            label={t(`saved.${candidate}`)}
            id={`saved-tab-${candidate}`}
            aria-controls={`saved-panel-${candidate}`}
          />
        ))}
      </Tabs>
      <div role="tabpanel" id={`saved-panel-${tab}`} aria-labelledby={`saved-tab-${tab}`}>
        {tab === 'homes' ? <SavedHomesSection /> : <SavedSearchesSection />}
      </div>
    </div>
  );
}
