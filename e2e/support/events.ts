import type { Client } from './client';

export interface LiveEvent {
    type: string;
    conversationId?: string;
    viewingId?: string;
}

export interface LiveStream {
    /** Every event heard so far, oldest first; grows while the stream is open. */
    readonly events: LiveEvent[];
    close: () => Promise<void>;
}

const EVENT_SEPARATOR = '\n\n';
const DATA_PREFIX = 'data:';

/**
 * Opens the client's live channel (`GET /api/v1/events`) as the browser's EventSource would, with its session cookie,
 * and collects the `data:` payloads as they arrive. The request context buffers a whole body, which a stream never
 * finishes, so Node's fetch reads it instead. The server subscribes before it flushes the headers, so once this
 * resolves every later event reaches the stream.
 */
export const openLiveStream = async (client: Client): Promise<LiveStream> => {
    const controller = new AbortController();
    const response = await fetch(`${client.baseURL}/api/v1/events`, {
        headers: { Accept: 'text/event-stream', Cookie: await client.cookieHeader() },
        signal: controller.signal,
    });
    if (!response.ok || !response.body) {
        throw new Error(`The live channel answered ${String(response.status)}`);
    }
    const events: LiveEvent[] = [];
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const pump = (async (): Promise<void> => {
        let buffer = '';
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                    return;
                }
                buffer += decoder.decode(value, { stream: true });
                let end = buffer.indexOf(EVENT_SEPARATOR);
                while (end !== -1) {
                    for (const line of buffer.slice(0, end).split('\n')) {
                        if (line.startsWith(DATA_PREFIX)) {
                            events.push(JSON.parse(line.slice(DATA_PREFIX.length).trim()) as LiveEvent);
                        }
                    }
                    buffer = buffer.slice(end + EVENT_SEPARATOR.length);
                    end = buffer.indexOf(EVENT_SEPARATOR);
                }
            }
        } catch {
            // Aborted by close(): the stream ends here.
        }
    })();
    return {
        events,
        close: async () => {
            controller.abort();
            await pump;
        },
    };
};
