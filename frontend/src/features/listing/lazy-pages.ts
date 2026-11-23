import { lazyWithPreload } from '@/shared/lib/lazy-with-preload';

export const HomePage = lazyWithPreload(async () => ({ default: (await import('./pages/home-page')).HomePage }));
export const BrowsePage = lazyWithPreload(async () => ({ default: (await import('./pages/browse-page')).BrowsePage }));
export const ListingPage = lazyWithPreload(async () => ({
    default: (await import('./pages/listing-page')).ListingPage,
}));
export const ManagedListingPage = lazyWithPreload(async () => ({
    default: (await import('./pages/managed-listing-page')).ManagedListingPage,
}));
export const ListingEditorPage = lazyWithPreload(async () => ({
    default: (await import('./pages/listing-editor-page')).ListingEditorPage,
}));
export const SavedPage = lazyWithPreload(async () => ({ default: (await import('./pages/saved-page')).SavedPage }));
