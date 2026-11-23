import type { PrismaClient } from '@/generated/prisma/client';
import { ConversationKind } from '@/modules/message/service/message-side';
import { ViewingStatus } from '@/modules/viewing/service/viewing-status';

import { type Line, messageRowsOf, readMarkersOf } from './seed-message-rows';
import { seedSupport } from './seed-support';

const HOUR_MS = 3_600_000;
const MAX_CONFIRMED = 100;

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
    readBy: { requester: boolean; responder: boolean };
}

interface ConfirmedViewing {
    id: string;
    tenantId: string;
    startsAt: Date;
    endsAt: Date;
}

/** Maya chats about a viewing ahead (his last line unread for her) and about one that took place. */
const showcasePlans = (confirmed: readonly ConfirmedViewing[], demoTenantId: string, now: Date): ThreadPlan[] => {
    const mayaAhead = confirmed.find(
        (viewing) => viewing.startsAt.getTime() > now.getTime() && viewing.tenantId === demoTenantId,
    );
    const mayaHeld = confirmed.find(
        (viewing) => viewing.endsAt.getTime() < now.getTime() && viewing.tenantId === demoTenantId,
    );
    return [
        ...(mayaAhead
            ? [
                  {
                      viewingId: mayaAhead.id,
                      tenantId: demoTenantId,
                      base: new Date(now.getTime() - 26 * HOUR_MS),
                      lines: CHAT_BEFORE_VIEWING,
                      readBy: { requester: false, responder: true },
                  },
              ]
            : []),
        ...(mayaHeld
            ? [
                  {
                      viewingId: mayaHeld.id,
                      tenantId: demoTenantId,
                      base: new Date(mayaHeld.endsAt.getTime() + HOUR_MS),
                      lines: CHAT_AFTER_VIEWING,
                      readBy: { requester: true, responder: true },
                  },
              ]
            : []),
    ];
};

/** Three renters' questions waiting for the landlord (his badge). */
const renterPlans = (confirmed: readonly ConfirmedViewing[], demoTenantId: string, now: Date): ThreadPlan[] =>
    confirmed
        .filter((viewing) => viewing.startsAt.getTime() > now.getTime() && viewing.tenantId !== demoTenantId)
        .slice(0, RENTER_QUESTIONS.length)
        .map((viewing, index) => ({
            viewingId: viewing.id,
            tenantId: viewing.tenantId,
            base: new Date(now.getTime() - (3 + index * 5) * HOUR_MS),
            lines: [{ side: 'TENANT', body: RENTER_QUESTIONS[index] ?? '', minutesAfterPrevious: 0 }],
            readBy: { requester: true, responder: false },
        }));

const seedThread = async (prisma: PrismaClient, plan: ThreadPlan, demoLandlordId: string): Promise<number> => {
    const rows = messageRowsOf(plan.lines, plan.base, plan.tenantId, demoLandlordId);
    const last = rows[rows.length - 1];
    if (!last) {
        return 0;
    }
    await prisma.conversation.create({
        data: {
            id: plan.viewingId,
            kind: ConversationKind.VIEWING,
            viewingId: plan.viewingId,
            lastMessageAt: last.createdAt,
            messageCount: rows.length,
            ...readMarkersOf(rows, last, plan.readBy),
            messages: { createMany: { data: rows } },
        },
        select: { id: true },
    });
    return rows.length;
};

/**
 * A few conversations for the demo: the showcase tenant with the showcase landlord, renters' questions waiting for
 * him, and two requests to Keyhaven (seed-support.ts). The viewings read is bounded by the viewings seed. Idempotent:
 * a viewing that has a thread is skipped and the requests are seeded once, so a second run adds nothing.
 */
export const seedMessages = async (
    prisma: PrismaClient,
    people: { demoTenantId: string; demoLandlordId: string; demoAgentId: string; demoAdminId: string },
    now: Date,
): Promise<{ threads: number; messages: number }> => {
    const confirmed = await prisma.viewing.findMany({
        where: {
            status: ViewingStatus.CONFIRMED,
            conversation: null,
            listing: { landlordId: people.demoLandlordId },
        },
        select: { id: true, tenantId: true, startsAt: true, endsAt: true },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: MAX_CONFIRMED,
    });
    const plans = [
        ...showcasePlans(confirmed, people.demoTenantId, now),
        ...renterPlans(confirmed, people.demoTenantId, now),
    ];
    let threads = 0;
    let messages = 0;
    for (const plan of plans) {
        const written = await seedThread(prisma, plan, people.demoLandlordId);
        threads += written > 0 ? 1 : 0;
        messages += written;
    }
    const support = await seedSupport(prisma, people, now);
    return { threads: threads + support.threads, messages: messages + support.messages };
};
