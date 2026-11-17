import { lazyWithPreload } from '@/shared/lib/lazy-with-preload';

/** Public surface of the message feature. The page is lazy so the router stays in the shell chunk. */
export const MessagesPage = lazyWithPreload(async () => ({
    default: (await import('./pages/messages-page')).MessagesPage,
}));
export { messageKeys } from './hooks/query-keys';
export { useUnreadMessages } from './hooks/use-message-queries';
