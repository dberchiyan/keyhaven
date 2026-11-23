import type { PrismaClient } from '@/generated/prisma/client';
import { ConversationKind } from '@/modules/message/service/message-side';

import { type Line, messageRowsOf, readMarkersOf } from './seed-message-rows';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

interface SupportPlan {
    openedById: string;
    subject: string;
    lines: readonly Line[];
    base: Date;
}

const supportPlans = (demoLandlordId: string, demoAgentId: string, now: Date): SupportPlan[] => [
    {
        openedById: demoLandlordId,
        subject: 'Changing the address of a published home',
        base: new Date(now.getTime() - 3 * DAY_MS),
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
    },
];

/**
 * Two requests to Keyhaven — one answered with a follow-up waiting, one unanswered — so the admin's inbox has work on
 * day one; the members read their own threads to the end. Seeded once: any support conversation means a re-run.
 */
export const seedSupport = async (
    prisma: PrismaClient,
    people: { demoLandlordId: string; demoAgentId: string; demoAdminId: string },
    now: Date,
): Promise<{ threads: number; messages: number }> => {
    if ((await prisma.conversation.count({ where: { kind: ConversationKind.SUPPORT } })) > 0) {
        return { threads: 0, messages: 0 };
    }
    let threads = 0;
    let messages = 0;
    for (const request of supportPlans(people.demoLandlordId, people.demoAgentId, now)) {
        const rows = messageRowsOf(request.lines, request.base, request.openedById, people.demoAdminId);
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
                ...readMarkersOf(rows, last, { requester: true, responder: false }),
                messages: { createMany: { data: rows } },
            },
            select: { id: true },
        });
        threads += 1;
        messages += rows.length;
    }
    return { threads, messages };
};
