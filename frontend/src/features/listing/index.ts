import { lazyWithPreload } from '@/shared/lib/lazyWithPreload';

/** Public surface of the listing feature. Pages are lazy so the router stays in the shell chunk. */
export const HomePage = lazyWithPreload(() => import('./pages/HomePage'));
export const BrowsePage = lazyWithPreload(() => import('./pages/BrowsePage'));
export const ListingPage = lazyWithPreload(() => import('./pages/ListingPage'));
export const ManagedListingPage = lazyWithPreload(() => import('./pages/ManagedListingPage'));
