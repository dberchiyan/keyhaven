export const messageKeys = {
    all: ['messages'] as const,
    inbox: () => [...messageKeys.all, 'inbox'] as const,
    summary: () => [...messageKeys.all, 'summary'] as const,
    thread: (conversationId: string) => [...messageKeys.all, 'thread', conversationId] as const,
};
