import { MessageSide } from '@/modules/message/service/message-side';

const MINUTE_MS = 60_000;

export interface Line {
    side: 'TENANT' | 'OWNER';
    body: string;
    minutesAfterPrevious: number;
}

export interface MessageRow {
    senderId: string;
    side: MessageSide;
    body: string;
    createdAt: Date;
}

/** Each line a few minutes after the one before; the tenant's side is the requester's, the owner's the responder's. */
export const messageRowsOf = (
    lines: readonly Line[],
    base: Date,
    requesterId: string,
    responderId: string,
): MessageRow[] => {
    let at = base.getTime();
    return lines.map((line) => {
        at += line.minutesAfterPrevious * MINUTE_MS;
        return {
            senderId: line.side === 'TENANT' ? requesterId : responderId,
            side: line.side === 'TENANT' ? MessageSide.REQUESTER : MessageSide.RESPONDER,
            body: line.body,
            createdAt: new Date(at),
        };
    });
};

/** A side has read everything up to its own last line (what it wrote, it saw). */
const readUpToOwn = (rows: readonly MessageRow[], side: string): Date | null => {
    const own = rows.filter((row) => row.side === side);
    return own[own.length - 1]?.createdAt ?? null;
};

/** A side that read the thread is at its last line; the other has the tail after its own last line unread. */
export const readMarkersOf = (
    rows: readonly MessageRow[],
    last: MessageRow,
    readBy: { requester: boolean; responder: boolean },
): { requesterReadAt: Date | null; responderReadAt: Date | null } => ({
    requesterReadAt: readBy.requester ? last.createdAt : readUpToOwn(rows, MessageSide.REQUESTER),
    responderReadAt: readBy.responder ? last.createdAt : readUpToOwn(rows, MessageSide.RESPONDER),
});
