import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { type Client, ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD, scalar, withDb } from '../../support/db';
import { openLiveStream } from '../../support/events';
import { emailAfter, emailCount, quietPeriod } from '../../support/mailbox';

const HOUR_MS = 3_600_000;

const hours = {
    slotMinutes: 30,
    noticeHours: 0,
    horizonDays: 14,
    windows: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: 8 * 60, end: 20 * 60 })),
    blockedDays: [],
    version: null,
};

interface SlotDay {
    day: string;
    slots: { startsAt: string }[];
}

test.describe.configure({ mode: 'serial' });

test.describe('Messages (a conversation per confirmed viewing)', () => {
    const clients = new ClientPool();
    let f: Fixtures;
    let tenant: Client;
    let otherTenant: Client;
    let landlord: Client;
    let otherLandlord: Client;
    let agent: Client;
    let admin: Client;
    let viewingId = '';

    test.beforeAll(async () => {
        f = await createFixtures(`msg-${randomUUID().slice(0, 8)}`);
        tenant = await clients.signedIn(f.tenant.email, PASSWORD);
        otherTenant = await clients.signedIn(f.otherTenant.email, PASSWORD);
        landlord = await clients.signedIn(f.landlord.email, PASSWORD);
        otherLandlord = await clients.signedIn(f.otherLandlord.email, PASSWORD);
        agent = await clients.signedIn(f.agent.email, PASSWORD);
        admin = await clients.signedIn(f.admin.email, PASSWORD);
    });

    test.afterAll(async () => {
        await clients.disposeAll();
    });

    const messages = (id: string): string => `/api/v1/conversations/${id}/messages`;
    const unreadOf = async (client: Client): Promise<number> =>
        Number((await client.get('/api/v1/conversations/summary')).body.unread);

    test('nothing can be written before the owner confirms; the inbox shows nothing yet', async () => {
        expect(
            (await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, hours)).status,
        ).toBe(200);
        const slots = await tenant.get(`/api/v1/listings/${f.landlordPublished}/viewing-slots?days=5`);
        const slot = (slots.body.days as SlotDay[])[2]?.slots[0];
        if (!slot) {
            throw new Error('No slot to pick');
        }
        const requested = await tenant.postIdempotent('/api/v1/viewings', {
            listingId: f.landlordPublished,
            startsAt: slot.startsAt,
        });
        expect(requested.status).toBe(200);
        viewingId = String(requested.body.id);

        const early = await tenant.postIdempotent(messages(viewingId), { body: 'Hello?' });
        expect(early.status).toBe(422);
        expect(String(early.body.message)).toContain('confirms');
        expect((await landlord.postIdempotent(messages(viewingId), { body: 'Hello back' })).status).toBe(422);
        expect((await tenant.get('/api/v1/conversations')).body).toMatchObject({ content: [] });
        expect(await unreadOf(landlord)).toBe(0);
        expect((await tenant.get(messages(viewingId))).body).toMatchObject({
            isOpen: false,
            messages: [],
            unread: 0,
        });
    });

    test('once confirmed both sides write; one email per run of unread messages; unread counts and read receipts', async () => {
        expect((await landlord.post(`/api/v1/viewings/${viewingId}/confirmation`)).status).toBe(200);
        expect((await tenant.get('/api/v1/conversations')).body).toMatchObject({
            content: [
                {
                    id: viewingId,
                    kind: 'VIEWING',
                    isOpen: true,
                    side: 'REQUESTER',
                    unread: 0,
                    lastMessage: null,
                    counterpart: { kind: 'LANDLORD', name: 'landlord Tester' },
                    listing: { address: { line1: '1 Secret St' } },
                },
            ],
        });

        const stream = await openLiveStream(landlord);
        const strangerStream = await openLiveStream(otherLandlord);
        const mailBefore = await emailCount();
        const first = await tenant.postIdempotent(messages(viewingId), {
            body: 'Hi! Is parking included in the rent?',
        });
        expect(first.status).toBe(200);
        await expect.poll(() => stream.events).toContainEqual({ type: 'message.created', conversationId: viewingId });
        await quietPeriod();
        expect(strangerStream.events).toEqual([]);
        await stream.close();
        await strangerStream.close();
        expect(first.body).toMatchObject({
            side: 'REQUESTER',
            sender: { firstName: 'tenant' },
            body: 'Hi! Is parking included in the rent?',
        });
        const mail = await emailAfter(f.landlord.email, mailBefore);
        expect(mail.subject).toContain('New message');
        expect(mail.text).toContain('parking');
        expect(mail.text).toContain(`/messages/${viewingId}`);
        const sentBefore = await emailCount();
        expect((await tenant.postIdempotent(messages(viewingId), { body: 'And is the garage gated?' })).status).toBe(
            200,
        );
        await quietPeriod();
        expect(await emailCount()).toBe(sentBefore);

        expect(await unreadOf(landlord)).toBe(2);
        expect((await landlord.get('/api/v1/conversations')).body).toMatchObject({
            content: [
                {
                    id: viewingId,
                    side: 'RESPONDER',
                    unread: 2,
                    messageCount: 2,
                    lastMessage: { side: 'REQUESTER', body: 'And is the garage gated?' },
                    counterpart: { kind: 'TENANT', name: 'tenant Tester' },
                },
            ],
        });
        const thread = (await landlord.get(messages(viewingId))).body;
        expect(thread).toMatchObject({ side: 'RESPONDER', unread: 2, isOpen: true });
        expect(thread.messages).toHaveLength(2);

        const read = await landlord.post(`/api/v1/conversations/${viewingId}/message-reads`);
        expect(read.status).toBe(200);
        expect(typeof read.body.readAt).toBe('string');
        expect(await unreadOf(landlord)).toBe(0);

        const replyBefore = await emailCount();
        const reply = await landlord.postIdempotent(messages(viewingId), {
            body: 'Yes — one spot in the gated garage, included.',
        });
        expect(reply.status).toBe(200);
        expect(reply.body).toMatchObject({ side: 'RESPONDER', sender: { firstName: 'landlord' } });
        expect((await emailAfter(f.tenant.email, replyBefore)).subject).toContain('New message');
        expect(await unreadOf(tenant)).toBe(1);
        expect((await tenant.get(messages(viewingId))).body).toMatchObject({ unread: 1 });
        expect(((await tenant.get(messages(viewingId))).body.messages as unknown[]).length).toBe(3);
        expect((await tenant.post(`/api/v1/conversations/${viewingId}/message-reads`)).status).toBe(200);
        expect(await unreadOf(tenant)).toBe(0);
        expect((await tenant.post(`/api/v1/conversations/${viewingId}/message-reads`)).status).toBe(200);
    });

    test('only the two sides take part: others are 403, admins read, nobody writes an empty message', async () => {
        expect((await otherTenant.get(messages(viewingId))).status).toBe(403);
        expect((await otherTenant.postIdempotent(messages(viewingId), { body: 'Hi' })).status).toBe(403);
        expect((await otherLandlord.get(messages(viewingId))).status).toBe(403);
        expect((await agent.get(messages(viewingId))).status).toBe(403);
        expect((await admin.get(messages(viewingId))).status).toBe(200);
        expect((await admin.postIdempotent(messages(viewingId), { body: 'Hi' })).status).toBe(422);
        expect((await admin.get(messages(randomUUID()))).status).toBe(404);
        expect(((await admin.get('/api/v1/conversations')).body.content as unknown[]).length).toBeGreaterThanOrEqual(1);
        expect((await agent.get('/api/v1/conversations')).body).toMatchObject({ content: [] });

        const empty = await tenant.postIdempotent(messages(viewingId), { body: '   ' });
        expect(empty.status).toBe(400);
        expect(empty.body).toMatchObject({ error: 'VALIDATION_FAILED', details: [{ field: 'body' }] });
        expect((await tenant.postIdempotent(messages(viewingId), { body: 'x'.repeat(2001) })).status).toBe(400);
    });

    test('a viewing that took place stays open; a cancelled one closes the conversation but keeps it readable', async () => {
        const heldId = await withDb((db) =>
            scalar<string>(
                db,
                `INSERT INTO viewings (listing_id, tenant_id, starts_at, ends_at, status, decided_at, updated_at)
                 VALUES ($1, $2, $3, $4, 'CONFIRMED', $5, now()) RETURNING id`,
                [
                    f.landlordPublished,
                    f.otherTenant.id,
                    new Date(Date.now() - 3 * HOUR_MS),
                    new Date(Date.now() - 2.5 * HOUR_MS),
                    new Date(Date.now() - 24 * HOUR_MS),
                ],
            ),
        );
        const thanks = await otherTenant.postIdempotent(messages(heldId), {
            body: 'Thanks for the tour — we would like to apply.',
        });
        expect(thanks.status).toBe(200);
        expect((await otherTenant.get('/api/v1/conversations')).body).toMatchObject({
            content: [{ id: heldId, isOpen: true, unread: 0 }],
        });
        const inbox = (await landlord.get('/api/v1/conversations')).body.content as {
            id: string;
        }[];
        expect(inbox[0]?.id).toBe(heldId);
        expect(inbox[1]?.id).toBe(viewingId);

        expect((await tenant.post(`/api/v1/viewings/${viewingId}/cancellation`)).status).toBe(200);
        const closed = await tenant.postIdempotent(messages(viewingId), { body: 'One more thing' });
        expect(closed.status).toBe(422);
        expect(String(closed.body.message)).toContain('closed');
        const thread = (await tenant.get(messages(viewingId))).body;
        expect(thread).toMatchObject({ isOpen: false, viewing: { status: 'CANCELLED' } });
        expect(thread.messages).toHaveLength(3);
        expect(
            ((await tenant.get('/api/v1/conversations')).body.content as { id: string }[]).some(
                (row) => row.id === viewingId,
            ),
        ).toBe(true);
    });

    test('a member writes to Keyhaven; the staff answers, closes and reopens; nobody else reads it', async () => {
        const started = await landlord.postIdempotent('/api/v1/conversations', {
            subject: 'Changing the address of a published home',
            body: 'I published with the wrong unit number — can I fix it?',
        });
        expect(started.status).toBe(200);
        expect(started.body).toMatchObject({
            kind: 'SUPPORT',
            isOpen: true,
            side: 'REQUESTER',
            viewing: null,
            support: { subject: 'Changing the address of a published home', closedAt: null },
            counterpart: { kind: 'KEYHAVEN', name: 'Keyhaven' },
            messageCount: 1,
            unread: 0,
        });
        const id = String(started.body.id);
        expect((await admin.postIdempotent('/api/v1/conversations', { subject: 'x', body: 'y' })).status).toBe(403);
        expect((await tenant.get(messages(id))).status).toBe(403);
        expect((await otherLandlord.get(messages(id))).status).toBe(403);
        expect((await admin.get(messages(randomUUID()))).status).toBe(404);

        const inbox = (await admin.get('/api/v1/conversations')).body.content as {
            id: string;
            unread: number;
            counterpart: { kind: string };
            side: string;
        }[];
        const row = inbox.find((candidate) => candidate.id === id);
        expect(row).toMatchObject({ unread: 1, side: 'RESPONDER', counterpart: { kind: 'LANDLORD' } });
        expect(await unreadOf(admin)).toBeGreaterThanOrEqual(1);

        const answerBefore = await emailCount();
        const answer = await admin.postIdempotent(messages(id), {
            body: 'Yes — Edit details, change the address; the home stays on the site.',
        });
        expect(answer.status).toBe(200);
        expect(answer.body).toMatchObject({ side: 'RESPONDER' });
        const mail = await emailAfter(f.landlord.email, answerBefore);
        expect(mail.subject).toContain('Keyhaven answered');
        expect(mail.text).toContain('Keyhaven wrote');
        const own = (await landlord.get('/api/v1/conversations')).body.content as {
            id: string;
            unread: number;
            counterpart: { kind: string };
        }[];
        expect(own.find((candidate) => candidate.id === id)).toMatchObject({
            unread: 1,
            counterpart: { kind: 'KEYHAVEN' },
        });

        const closed = await admin.post(`/api/v1/conversations/${id}/closure`);
        expect(closed.status).toBe(200);
        expect(closed.body).toMatchObject({
            isOpen: false,
            support: { subject: 'Changing the address of a published home' },
        });
        expect(typeof (closed.body.support as { closedAt: unknown }).closedAt).toBe('string');
        expect((await landlord.postIdempotent(messages(id), { body: 'More?' })).status).toBe(422);
        expect((await landlord.post(`/api/v1/conversations/${id}/closure`)).status).toBe(403);
        expect((await admin.post(`/api/v1/conversations/${viewingId}/closure`)).status).toBe(422);
        expect((await admin.post(`/api/v1/conversations/${id}/closure`)).status).toBe(200);
        expect((await admin.post(`/api/v1/conversations/${id}/reopening`)).body).toMatchObject({
            isOpen: true,
        });
        expect((await landlord.postIdempotent(messages(id), { body: 'More, thanks.' })).status).toBe(200);
        expect((await landlord.postIdempotent('/api/v1/conversations', { subject: '', body: 'x' })).status).toBe(400);
    });
});
