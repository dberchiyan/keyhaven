import { lazyWithPreload } from '@/shared/lib/lazy-with-preload';

export const MessagesPage = lazyWithPreload(async () => ({
    default: (await import('./pages/messages-page')).MessagesPage,
}));
export { messageKeys } from './hooks/query-keys';
export { useUnreadMessages } from './hooks/use-message-queries';
