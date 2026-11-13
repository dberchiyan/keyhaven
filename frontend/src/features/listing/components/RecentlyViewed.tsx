import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/features/auth';
import { useRecentlyViewed } from '../hooks/useListingQueries';
import { readRecentlyViewed } from '../lib/recentlyViewed';
import { ListingStrip } from './ListingStrip';

/** The homes this person (or this browser) opened lately; empty for a first visit. */
export function RecentlyViewed() {
  const { t } = useTranslation('listing');
  const { data: user } = useCurrentUser();
  // Read once per mount: the list changes only by opening a home, which is another page.
  const [localIds] = useState(readRecentlyViewed);
  const recent = useRecentlyViewed(user, localIds);
  return (
    <ListingStrip id="recent-heading" title={t('browse.recent')} listings={recent.data ?? []} />
  );
}
