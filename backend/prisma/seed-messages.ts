import type { PrismaClient } from '@/generated/prisma/client';
import { ConversationKind, MessageSide } from '@/modules/message/service/message-side';
import { ViewingStatus } from '@/modules/viewing/service/viewing-status';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

interface Line {
    side: 'TENANT' | 'OWNER';
    body: string;
    minutesAfterPrevious: number;
}

const CHAT_BEFORE_VIEWING: readonly Line[] = [
    {
        side: 'TENANT',
        body: 'Hi Daniel, thanks for confirming! Is there street parking nearby, or is the spot in the garage?',
        minutesAfterPrevious: 0,
    },
    {
        side: 'OWNER',
        body: 'Hi Maya — one assigned spot in the garage, included in the rent. Street parking is easy too.',
        minutesAfterPrevious: 170,
    },
    {
        side: 'TENANT',
        body: 'Perfect. We will be there a few minutes early. Could we also see the storage unit?',
        minutesAfterPrevious: 55,
    },
    { side: 'OWNER', body: 'Of course, I will bring the key. See you then.', minutesAfterPrevious: 40 },
];

const CHAT_AFTER_VIEWING: readonly Line[] = [
    {
        side: 'TENANT',
        body: 'Thank you for the tour today — the light in the living room is wonderful.',
        minutesAfterPrevious: 0,
    },
    {
        side: 'OWNER',
        body: 'Glad you liked it! Let me know if you want to apply; I can hold it until Friday.',
        minutesAfterPrevious: 95,
    },
    { side: 'TENANT', body: 'We would love to. What do you need from us?', minutesAfterPrevious: 30 },
];

const RENTER_QUESTIONS = [
    'Hello! Looking forward to Thursday. Is the apartment free from the 1st, or could it be earlier?',
    'Hi, a quick question before the viewing — are cats OK? We have one, very quiet.',
    'We might be ten minutes late, coming straight from the airport. Hope that is fine!',
] as const;

interface ThreadPlan {
    viewingId: string;
    tenantId: string;
    base: Date;
    lines: readonly Line[];
    readBy: readonly ('TENANT' | 'OWNER')[];
}

/**
 * A few conversations for the demo: the showcase tenant chatting with the showcase landlord about
 * a viewing ahead (his last line unread for her) and about one that took place, three renters'
 * questions waiting for the landlord (his badge), and two requests to Keyhaven (one answered, one
 * waiting for the staff, so the admin's inbox has work on day one). `readBy` names the sides that read a thread to
 * its last line; the other side has the tail unread. The viewings read is bounded by the viewings seed. Idempotent: a
 * viewing that has a thread is skipped and the requests are seeded once, so a second run adds nothing.
 */
export const seedMessages = async (
    prisma: PrismaClient,
    demoTenantId: string,
    demoLandlordId: string,
    demoAgentId: string,
    demoAdminId: string,
    now: Date,
): Promise<{ threads: number; messages: number }> => {
    const confirmed = await prisma.viewing.findMany({
        where: {
            status: ViewingStatus.CONFIRMED,
            conversation: null,
            listing: { landlordId: demoLandlordId },
        },
        select: { id: true, tenantId: true, startsAt: true, endsAt: true },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: 100,
    });
    const ahead = confirmed.filter((viewing) => viewing.startsAt.getTime() > now.getTime());
    const held = confirmed.filter((viewing) => viewing.endsAt.getTime() < now.getTime());
    const plans: ThreadPlan[] = [];
    const mayaAhead = ahead.find((viewing) => viewing.tenantId === demoTenantId);
    if (mayaAhead) {
        plans.push({
            viewingId: mayaAhead.id,
            tenantId: demoTenantId,
            base: new Date(now.getTime() - 26 * HOUR_MS),
            lines: CHAT_BEFORE_VIEWING,
            readBy: ['OWNER'],
        });
    }
    const mayaHeld = held.find((viewing) => viewing.tenantId === demoTenantId);
    if (mayaHeld) {
        plans.push({
            viewingId: mayaHeld.id,
            tenantId: demoTenantId,
            base: new Date(mayaHeld.endsAt.getTime() + HOUR_MS),
            lines: CHAT_AFTER_VIEWING,
            readBy: ['TENANT', 'OWNER'],
        });
    }
    ahead
        .filter((viewing) => viewing.tenantId !== demoTenantId)
        .slice(0, RENTER_QUESTIONS.length)
        .forEach((viewing, index) => {
            plans.push({
                viewingId: viewing.id,
                tenantId: viewing.tenantId,
                base: new Date(now.getTime() - (3 + index * 5) * HOUR_MS),
                lines: [{ side: 'TENANT', body: RENTER_QUESTIONS[index] ?? '', minutesAfterPrevious: 0 }],
                readBy: ['TENANT'],
            });
        });

    let threads = 0;
    let messages = 0;
    for (const plan of plans) {
        let at = plan.base.getTime();
        const rows = plan.lines.map((line) => {
            at += line.minutesAfterPrevious * MINUTE_MS;
            return {
                senderId: line.side === 'TENANT' ? plan.tenantId : demoLandlordId,
                side: line.side === 'TENANT' ? MessageSide.REQUESTER : MessageSide.RESPONDER,
                body: line.body,
                createdAt: new Date(at),
            };
        });
        const last = rows[rows.length - 1];
        if (!last) {
            continue;
        }
        await prisma.conversation.create({
            data: {
                id: plan.viewingId,
                kind: ConversationKind.VIEWING,
                viewingId: plan.viewingId,
                lastMessageAt: last.createdAt,
                messageCount: rows.length,
                requesterReadAt: plan.readBy.includes('TENANT')
                    ? last.createdAt
                    : readUpToOwn(rows, MessageSide.REQUESTER),
                responderReadAt: plan.readBy.includes('OWNER')
                    ? last.createdAt
                    : readUpToOwn(rows, MessageSide.RESPONDER),
                messages: { createMany: { data: rows } },
            },
            select: { id: true },
        });
        threads += 1;
        messages += rows.length;
    }
    const supportOpen = await prisma.conversation.count({
        where: { kind: ConversationKind.SUPPORT },
    });
    if (supportOpen === 0) {
        const requests: {
            openedById: string;
            subject: string;
            lines: readonly Line[];
            readBy: readonly ('REQUESTER' | 'RESPONDER')[];
            base: Date;
        }[] = [
            {
                openedById: demoLandlordId,
                subject: 'Changing the address of a published home',
                base: new Date(now.getTime() - 3 * 86_400_000),
                lines: [
                    {
                        side: 'TENANT',
                        body: 'Hi! I published my LoHi apartment with the wrong unit number. Can I fix the address without unpublishing it?',
                        minutesAfterPrevious: 0,
                    },
                    {
                        side: 'OWNER',
                        body: 'Hi Daniel — yes: open the listing, choose Edit details and change the address; the home stays on the site. Tenants with a confirmed viewing get the corrected address by email.',
                        minutesAfterPrevious: 140,
                    },
                    {
                        side: 'TENANT',
                        body: 'Done, thank you! One more thing: can I change the city as well?',
                        minutesAfterPrevious: 60,
                    },
                ],
                readBy: ['REQUESTER'],
            },
            {
                openedById: demoAgentId,
                subject: 'Adding a colleague to Harborline Realty',
                base: new Date(now.getTime() - 5 * HOUR_MS),
                lines: [
                    {
                        side: 'TENANT',
                        body: 'A new agent joined us this week. How do we add her to the agency so she can manage our listings?',
                        minutesAfterPrevious: 0,
                    },
                ],
                readBy: ['REQUESTER'],
            },
        ];
        for (const request of requests) {
            let at = request.base.getTime();
            const rows = request.lines.map((line) => {
                at += line.minutesAfterPrevious * MINUTE_MS;
                return {
                    senderId: line.side === 'TENANT' ? request.openedById : demoAdminId,
                    side: line.side === 'TENANT' ? MessageSide.REQUESTER : MessageSide.RESPONDER,
                    body: line.body,
                    createdAt: new Date(at),
                };
            });
            const last = rows[rows.length - 1];
            if (!last) {
                continue;
            }
            await prisma.conversation.create({
                data: {
                    kind: ConversationKind.SUPPORT,
                    subject: request.subject,
                    openedById: request.openedById,
                    createdAt: rows[0]?.createdAt ?? last.createdAt,
                    lastMessageAt: last.createdAt,
                    messageCount: rows.length,
                    requesterReadAt: request.readBy.includes('REQUESTER')
                        ? last.createdAt
                        : readUpToOwn(rows, MessageSide.REQUESTER),
                    responderReadAt: request.readBy.includes('RESPONDER')
                        ? last.createdAt
                        : readUpToOwn(rows, MessageSide.RESPONDER),
                    messages: { createMany: { data: rows } },
                },
                select: { id: true },
            });
            threads += 1;
            messages += rows.length;
        }
    }
    return { threads, messages };
};

/** A side has read everything up to its own last line (what it wrote, it saw). */
const readUpToOwn = (rows: { side: string; createdAt: Date }[], side: string): Date | null => {
    const own = rows.filter((row) => row.side === side);
    return own[own.length - 1]?.createdAt ?? null;
};
