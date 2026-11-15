import { lazyWithPreload } from '@/shared/lib/lazyWithPreload';

/** Public surface of the message feature. The page is lazy so the router stays in the shell chunk. */
export const MessagesPage = lazyWithPreload(() => import('./pages/MessagesPage'));
export { useUnreadMessages } from './hooks/useMessageQueries';
export { messageKeys } from './hooks/queryKeys';
