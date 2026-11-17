import { lazyWithPreload } from '@/shared/lib/lazy-with-preload';

/** Public surface of the viewing feature. The page is lazy so the router stays in the shell chunk. */
export const ViewingsPage = lazyWithPreload(async () => ({
    default: (await import('./pages/viewings-page')).ViewingsPage,
}));
export { BookViewingSection } from './components/book-viewing-section';
export { ListingViewingsSection } from './components/listing-viewings-section';
export { ScheduleSection } from './components/schedule-section';
export { ViewingStatusBadge } from './components/viewing-status-badge';
export { displayStatus, formatSlot, formatSlotDate, zoneName } from './format';
export { viewingKeys } from './hooks/query-keys';
export { useViewingSummary } from './hooks/use-viewing-queries';
