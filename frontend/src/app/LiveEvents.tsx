import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCurrentUser } from '@/features/auth';
import { messageKeys } from '@/features/message';
import { viewingKeys } from '@/features/viewing';
import { subscribeLiveEvents } from '@/shared/api/liveEvents';

/**
 * Keeps the live channel open while someone is signed in and turns each event into the
 * narrowest re-read: a message or a read touches the conversations, a viewing change the
 * viewings (and the inbox: a confirmation opens a conversation). Composed here because the
 * channel serves several features; a subscription is what an effect is for (it is not a fetch).
 */
export function LiveEvents() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const userId = user?.id;
  useEffect(() => {
    if (userId === undefined) {
      return undefined;
    }
    return subscribeLiveEvents((event) => {
      switch (event.type) {
        case 'message.created':
        case 'message.read':
          void queryClient.invalidateQueries({ queryKey: messageKeys.all });
          return;
        case 'viewing.changed':
          void queryClient.invalidateQueries({ queryKey: viewingKeys.all });
          void queryClient.invalidateQueries({ queryKey: messageKeys.all });
          return;
        case 'ping':
          return;
      }
    });
  }, [userId, queryClient]);
  return null;
}
