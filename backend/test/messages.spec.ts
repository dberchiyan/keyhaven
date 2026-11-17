import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PG_SESSION_OPTIONS } from '../src/common/persistence/pg-pool';
import { PrismaClient } from '../src/generated/prisma/client';
import { EventService } from '../src/modules/event/service/event.service';
import type { LiveEvent } from '../src/modules/event/service/live-event';
import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';
import { testDatabaseUrl } from './test-database';

const HOUR_MS = 3_600_000;

/** Every day 08:00–20:00 local, half-hour slots, no notice, two weeks ahead. */
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

/**
 * Messages: a conversation per viewing that opens when the owner confirms (nobody writes to a
 * stranger), the unread counts and read receipts of each side, one email per run of unread
 * messages, who may read and write, and the closed thread of a cancelled viewing.
 */
describe('Messages (a conversation per confirmed viewing)', () => {
    let testApp: TestApp;
    let f: Fixtures;
    let tenant: Client;
    let otherTenant: Client;
    let landlord: Client;
    let otherLandlord: Client;
    let agent: Client;
    let admin: Client;
    let viewingId = '';

    beforeAll(async () => {
        testApp = await createTestApp();
        f = await createFixtures(`msg-${randomUUID().slice(0, 8)}`);
        tenant = new Client(testApp.app);
        otherTenant = new Client(testApp.app);
        landlord = new Client(testApp.app);
        otherLandlord = new Client(testApp.app);
        agent = new Client(testApp.app);
        admin = new Client(testApp.app);
        for (const [client, user] of [
            [tenant, f.tenant],
            [otherTenant, f.otherTenant],
            [landlord, f.landlord],
            [otherLandlord, f.otherLandlord],
            [agent, f.agent],
            [admin, f.admin],
        ] as const) {
            expect((await client.login(user.email, PASSWORD)).status).toBe(200);
        }
    });

    afterAll(async () => {
        await testApp.close();
    });

    const messages = (id: string): string => `/api/v1/conversations/${id}/messages`;
    const unreadOf = async (client: Client): Promise<number> =>
        Number(bodyOf(await client.get('/api/v1/conversations/summary')).unread);

    it('nothing can be written before the owner confirms; the inbox shows nothing yet', async () => {
        expect(
            (await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, hours)).status,
        ).toBe(200);
        const slots = await tenant.get(`/api/v1/listings/${f.landlordPublished}/viewing-slots?days=5`);
        const slot = (bodyOf(slots).days as SlotDay[])[2]?.slots[0];
        if (!slot) {
            throw new Error('No slot to pick');
        }
        const requested = await tenant.postIdempotent('/api/v1/viewings', {
            listingId: f.landlordPublished,
            startsAt: slot.startsAt,
        });
        expect(requested.status).toBe(200);
        viewingId = String(bodyOf(requested).id);

        const early = await tenant.postIdempotent(messages(viewingId), { body: 'Hello?' });
        expect(early.status).toBe(422);
        expect(String(bodyOf(early).message)).toContain('confirms');
        expect((await landlord.postIdempotent(messages(viewingId), { body: 'Hello back' })).status).toBe(422);
        expect(bodyOf(await tenant.get('/api/v1/conversations'))).toMatchObject({ content: [] });
        expect(await unreadOf(landlord)).toBe(0);
        // Readable, empty, closed to writing.
        expect(bodyOf(await tenant.get(messages(viewingId)))).toMatchObject({
            open: false,
            messages: [],
            unread: 0,
        });
    });

    it('once confirmed both sides write; one email per run of unread messages; unread counts and read receipts', async () => {
        expect((await landlord.post(`/api/v1/viewings/${viewingId}/confirmation`)).status).toBe(200);
        expect(bodyOf(await tenant.get('/api/v1/conversations'))).toMatchObject({
            content: [
                {
                    id: viewingId,
                    kind: 'VIEWING',
                    open: true,
                    side: 'REQUESTER',
                    unread: 0,
                    lastMessage: null,
                    counterpart: { kind: 'LANDLORD', name: 'landlord Tester' },
                    listing: { address: { line1: '1 Secret St' } },
                },
            ],
        });

        // The landlord's open tab hears of the message at once (the live channel), the stray
        // other landlord's does not.
        const events = testApp.app.get(EventService);
        const heard: LiveEvent[] = [];
        const strangerHeard: LiveEvent[] = [];
        const stream = events.subscribe(f.landlord.id, null, false).subscribe((event) => heard.push(event));
        const strangerStream = events
            .subscribe(f.otherLandlord.id, null, false)
            .subscribe((event) => strangerHeard.push(event));
        const first = await tenant.postIdempotent(messages(viewingId), {
            body: 'Hi! Is parking included in the rent?',
        });
        expect(first.status).toBe(200);
        expect(heard).toContainEqual({ type: 'message.created', conversationId: viewingId });
        expect(strangerHeard).toEqual([]);
        stream.unsubscribe();
        strangerStream.unsubscribe();
        expect(first.body).toMatchObject({
            side: 'REQUESTER',
            sender: { firstName: 'tenant' },
            body: 'Hi! Is parking included in the rent?',
        });
        const mail = testApp.emails.lastTo(f.landlord.email);
        expect(mail?.subject).toContain('New message');
        expect(mail?.text).toContain('parking');
        expect(mail?.text).toContain(`/messages/${viewingId}`);
        // A second message while the first is unread: no second email.
        const sentBefore = testApp.emails.sent.length;
        expect((await tenant.postIdempotent(messages(viewingId), { body: 'And is the garage gated?' })).status).toBe(
            200,
        );
        expect(testApp.emails.sent.length).toBe(sentBefore);

        expect(await unreadOf(landlord)).toBe(2);
        expect(bodyOf(await landlord.get('/api/v1/conversations'))).toMatchObject({
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
        const thread = bodyOf(await landlord.get(messages(viewingId)));
        expect(thread).toMatchObject({ side: 'RESPONDER', unread: 2, open: true });
        expect(thread.messages).toHaveLength(2);

        const read = await landlord.post(`/api/v1/conversations/${viewingId}/message-reads`);
        expect(read.status).toBe(200);
        expect(typeof bodyOf(read).readAt).toBe('string');
        expect(await unreadOf(landlord)).toBe(0);

        const reply = await landlord.postIdempotent(messages(viewingId), {
            body: 'Yes — one spot in the gated garage, included.',
        });
        expect(reply.status).toBe(200);
        expect(reply.body).toMatchObject({ side: 'RESPONDER', sender: { firstName: 'landlord' } });
        expect(testApp.emails.lastTo(f.tenant.email)?.subject).toContain('New message');
        expect(await unreadOf(tenant)).toBe(1);
        expect(bodyOf(await tenant.get(messages(viewingId)))).toMatchObject({ unread: 1 });
        expect((bodyOf(await tenant.get(messages(viewingId))).messages as unknown[]).length).toBe(3);
        expect((await tenant.post(`/api/v1/conversations/${viewingId}/message-reads`)).status).toBe(200);
        expect(await unreadOf(tenant)).toBe(0);
        // Reading again changes nothing; a fresh landlord reply is the next unread.
        expect((await tenant.post(`/api/v1/conversations/${viewingId}/message-reads`)).status).toBe(200);
    });

    it('only the two sides take part: others are 403, admins read, nobody writes an empty message', async () => {
        expect((await otherTenant.get(messages(viewingId))).status).toBe(403);
        expect((await otherTenant.postIdempotent(messages(viewingId), { body: 'Hi' })).status).toBe(403);
        expect((await otherLandlord.get(messages(viewingId))).status).toBe(403);
        expect((await agent.get(messages(viewingId))).status).toBe(403);
        expect((await admin.get(messages(viewingId))).status).toBe(200);
        // The staff reads a viewing's thread, never writes in it.
        expect((await admin.postIdempotent(messages(viewingId), { body: 'Hi' })).status).toBe(422);
        expect((await admin.get(messages(randomUUID()))).status).toBe(404);
        expect((bodyOf(await admin.get('/api/v1/conversations')).content as unknown[]).length).toBeGreaterThanOrEqual(
            1,
        );
        expect(bodyOf(await agent.get('/api/v1/conversations'))).toMatchObject({ content: [] });

        const empty = await tenant.postIdempotent(messages(viewingId), { body: '   ' });
        expect(empty.status).toBe(400);
        expect(empty.body).toMatchObject({ error: 'VALIDATION_FAILED', details: [{ field: 'body' }] });
        expect((await tenant.postIdempotent(messages(viewingId), { body: 'x'.repeat(2001) })).status).toBe(400);
    });

    it('a viewing that took place stays open; a cancelled one closes the conversation but keeps it readable', async () => {
        const db = new PrismaClient({
            adapter: new PrismaPg({ connectionString: testDatabaseUrl(), options: PG_SESSION_OPTIONS }),
        });
        try {
            const held = await db.viewing.create({
                data: {
                    listingId: f.landlordPublished,
                    tenantId: f.otherTenant.id,
                    startsAt: new Date(Date.now() - 3 * HOUR_MS),
                    endsAt: new Date(Date.now() - 2.5 * HOUR_MS),
                    status: 'CONFIRMED',
                    decidedAt: new Date(Date.now() - 24 * HOUR_MS),
                },
                select: { id: true },
            });
            const thanks = await otherTenant.postIdempotent(messages(held.id), {
                body: 'Thanks for the tour — we would like to apply.',
            });
            expect(thanks.status).toBe(200);
            expect(bodyOf(await otherTenant.get('/api/v1/conversations'))).toMatchObject({
                content: [{ id: held.id, open: true, unread: 0 }],
            });
            // The landlord's inbox lists the latest message first.
            const inbox = bodyOf(await landlord.get('/api/v1/conversations')).content as {
                id: string;
            }[];
            expect(inbox[0]?.id).toBe(held.id);
            expect(inbox[1]?.id).toBe(viewingId);
        } finally {
            await db.$disconnect();
        }

        expect((await tenant.post(`/api/v1/viewings/${viewingId}/cancellation`)).status).toBe(200);
        const closed = await tenant.postIdempotent(messages(viewingId), { body: 'One more thing' });
        expect(closed.status).toBe(422);
        expect(String(bodyOf(closed).message)).toContain('closed');
        const thread = bodyOf(await tenant.get(messages(viewingId)));
        expect(thread).toMatchObject({ open: false, viewing: { status: 'CANCELLED' } });
        expect(thread.messages).toHaveLength(3);
        expect(
            (bodyOf(await tenant.get('/api/v1/conversations')).content as { id: string }[]).some(
                (row) => row.id === viewingId,
            ),
        ).toBe(true);
    });

    it('a member writes to Keyhaven; the staff answers, closes and reopens; nobody else reads it', async () => {
        const started = await landlord.postIdempotent('/api/v1/conversations', {
            subject: 'Changing the address of a published home',
            body: 'I published with the wrong unit number — can I fix it?',
        });
        expect(started.status).toBe(200);
        expect(started.body).toMatchObject({
            kind: 'SUPPORT',
            open: true,
            side: 'REQUESTER',
            viewing: null,
            support: { subject: 'Changing the address of a published home', closedAt: null },
            counterpart: { kind: 'KEYHAVEN', name: 'Keyhaven' },
            messageCount: 1,
            unread: 0,
        });
        const id = String(bodyOf(started).id);
        // The staff does not ask; a stranger's request is 403 (an unknown id 404 to the staff).
        expect((await admin.postIdempotent('/api/v1/conversations', { subject: 'x', body: 'y' })).status).toBe(403);
        expect((await tenant.get(messages(id))).status).toBe(403);
        expect((await otherLandlord.get(messages(id))).status).toBe(403);
        expect((await admin.get(messages(randomUUID()))).status).toBe(404);

        const inbox = bodyOf(await admin.get('/api/v1/conversations')).content as {
            id: string;
            unread: number;
            counterpart: { kind: string };
            side: string;
        }[];
        const row = inbox.find((candidate) => candidate.id === id);
        expect(row).toMatchObject({ unread: 1, side: 'RESPONDER', counterpart: { kind: 'LANDLORD' } });
        expect(await unreadOf(admin)).toBeGreaterThanOrEqual(1);

        const answer = await admin.postIdempotent(messages(id), {
            body: 'Yes — Edit details, change the address; the home stays on the site.',
        });
        expect(answer.status).toBe(200);
        expect(answer.body).toMatchObject({ side: 'RESPONDER' });
        const mail = testApp.emails.lastTo(f.landlord.email);
        expect(mail?.subject).toContain('Keyhaven answered');
        expect(mail?.text).toContain('Keyhaven wrote');
        const own = bodyOf(await landlord.get('/api/v1/conversations')).content as {
            id: string;
            unread: number;
            counterpart: { kind: string };
        }[];
        expect(own.find((candidate) => candidate.id === id)).toMatchObject({
            unread: 1,
            counterpart: { kind: 'KEYHAVEN' },
        });

        // Closed: read-only for both until reopened; closing a viewing's thread is not a thing.
        const closed = await admin.post(`/api/v1/conversations/${id}/closure`);
        expect(closed.status).toBe(200);
        expect(closed.body).toMatchObject({
            open: false,
            support: { subject: 'Changing the address of a published home' },
        });
        expect(typeof (bodyOf(closed).support as { closedAt: unknown }).closedAt).toBe('string');
        expect((await landlord.postIdempotent(messages(id), { body: 'More?' })).status).toBe(422);
        expect((await landlord.post(`/api/v1/conversations/${id}/closure`)).status).toBe(403);
        expect((await admin.post(`/api/v1/conversations/${viewingId}/closure`)).status).toBe(422);
        expect((await admin.post(`/api/v1/conversations/${id}/closure`)).status).toBe(200);
        expect(bodyOf(await admin.post(`/api/v1/conversations/${id}/reopening`))).toMatchObject({
            open: true,
        });
        expect((await landlord.postIdempotent(messages(id), { body: 'More, thanks.' })).status).toBe(200);
        expect((await landlord.postIdempotent('/api/v1/conversations', { subject: '', body: 'x' })).status).toBe(400);
    });
});
