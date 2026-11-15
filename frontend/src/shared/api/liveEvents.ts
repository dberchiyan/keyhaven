import { z } from 'zod';
import { env } from '@/shared/config/env';

/** What the server pushes (backend `modules/event/service/live-event.ts`); ids only. */
const liveEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message.created'), viewingId: z.string() }),
  z.object({ type: z.literal('message.read'), viewingId: z.string() }),
  z.object({ type: z.literal('viewing.changed'), viewingId: z.string() }),
  z.object({ type: z.literal('ping') }),
]);
export type LiveEvent = z.infer<typeof liveEventSchema>;

/**
 * The live channel: one Server-Sent Events stream (`GET /api/v1/events`) for the signed-in
 * browser. `EventSource` is the one API call outside the Axios instance — Axios cannot hold a
 * stream — and it carries the session cookie by itself (same origin, or `withCredentials`).
 * The browser reconnects on its own after a drop; polling stays as the safety net. Returns the
 * function that closes the stream.
 */
export const subscribeLiveEvents = (onEvent: (event: LiveEvent) => void): (() => void) => {
  const source = new EventSource(`${env.VITE_API_BASE_URL}/api/v1/events`, {
    withCredentials: env.VITE_API_BASE_URL !== '',
  });
  source.onmessage = (message: MessageEvent<string>) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(message.data);
    } catch {
      return;
    }
    const event = liveEventSchema.safeParse(parsed);
    if (event.success && event.data.type !== 'ping') {
      onEvent(event.data);
    }
  };
  return () => {
    source.close();
  };
};
