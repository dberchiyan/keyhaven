import { lazyWithPreload } from '@/shared/lib/lazy-with-preload';

export { AppLayout } from './components/app-layout';
export { RoleLayout } from './components/role-layout';
export { SiteLayout } from './components/site-layout';
export const NotFoundPage = lazyWithPreload(async () => ({
    default: (await import('./pages/not-found-page')).NotFoundPage,
}));
