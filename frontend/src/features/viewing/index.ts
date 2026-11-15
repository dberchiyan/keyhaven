import { lazyWithPreload } from '@/shared/lib/lazyWithPreload';

/** Public surface of the viewing feature. The page is lazy so the router stays in the shell chunk. */
export const ViewingsPage = lazyWithPreload(() => import('./pages/ViewingsPage'));
export { BookViewingSection } from './components/BookViewingSection';
export { ListingViewingsSection } from './components/ListingViewingsSection';
export { ScheduleSection } from './components/ScheduleSection';
export { useViewingSummary } from './hooks/useViewingQueries';
