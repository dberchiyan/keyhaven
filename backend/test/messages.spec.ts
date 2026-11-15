import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PG_SESSION_OPTIONS } from '../src/common/persistence/pg-pool';
import { PrismaClient } from '../src/generated/prisma/client';
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

  const messages = (id: string): string => `/api/v1/viewings/${id}/messages`;
  const unreadOf = async (client: Client): Promise<number> =>
    Number(bodyOf(await client.get('/api/v1/conversations/summary')).unread);

  it('nothing can be written before the owner confirms; the inbox shows nothing yet', async () => {
    expect(
      (
        await landlord.put(
          `/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`,
          hours,
        )
      ).status,
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
    expect(
      (await landlord.postIdempotent(messages(viewingId), { body: 'Hello back' })).status,
    ).toBe(422);
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
          viewingId,
          open: true,
          side: 'TENANT',
          unread: 0,
          lastMessage: null,
          counterpart: { kind: 'LANDLORD', name: 'landlord Tester' },
          listing: { address: { line1: '1 Secret St' } },
        },
      ],
    });

    const first = await tenant.postIdempotent(messages(viewingId), {
      body: 'Hi! Is parking included in the rent?',
    });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      side: 'TENANT',
      sender: { firstName: 'tenant' },
      body: 'Hi! Is parking included in the rent?',
    });
    const mail = testApp.emails.lastTo(f.landlord.email);
    expect(mail?.subject).toContain('New message');
    expect(mail?.text).toContain('parking');
    expect(mail?.text).toContain(`/messages/${viewingId}`);
    // A second message while the first is unread: no second email.
    const sentBefore = testApp.emails.sent.length;
    expect(
      (await tenant.postIdempotent(messages(viewingId), { body: 'And is the garage gated?' }))
        .status,
    ).toBe(200);
    expect(testApp.emails.sent.length).toBe(sentBefore);

    expect(await unreadOf(landlord)).toBe(2);
    expect(bodyOf(await landlord.get('/api/v1/conversations'))).toMatchObject({
      content: [
        {
          viewingId,
          side: 'OWNER',
          unread: 2,
          messageCount: 2,
          lastMessage: { side: 'TENANT', body: 'And is the garage gated?' },
          counterpart: { kind: 'TENANT', name: 'tenant Tester' },
        },
      ],
    });
    const thread = bodyOf(await landlord.get(messages(viewingId)));
    expect(thread).toMatchObject({ side: 'OWNER', unread: 2, open: true });
    expect(thread.messages).toHaveLength(2);

    const read = await landlord.post(`/api/v1/viewings/${viewingId}/message-reads`);
    expect(read.status).toBe(200);
    expect(typeof bodyOf(read).readAt).toBe('string');
    expect(await unreadOf(landlord)).toBe(0);

    const reply = await landlord.postIdempotent(messages(viewingId), {
      body: 'Yes — one spot in the gated garage, included.',
    });
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ side: 'OWNER', sender: { firstName: 'landlord' } });
    expect(testApp.emails.lastTo(f.tenant.email)?.subject).toContain('New message');
    expect(await unreadOf(tenant)).toBe(1);
    expect(bodyOf(await tenant.get(messages(viewingId)))).toMatchObject({ unread: 1 });
    expect((bodyOf(await tenant.get(messages(viewingId))).messages as unknown[]).length).toBe(3);
    expect((await tenant.post(`/api/v1/viewings/${viewingId}/message-reads`)).status).toBe(200);
    expect(await unreadOf(tenant)).toBe(0);
    // Reading again changes nothing; a fresh landlord reply is the next unread.
    expect((await tenant.post(`/api/v1/viewings/${viewingId}/message-reads`)).status).toBe(200);
  });

  it('only the two sides take part: others are 403, admins read, nobody writes an empty message', async () => {
    expect((await otherTenant.get(messages(viewingId))).status).toBe(403);
    expect((await otherTenant.postIdempotent(messages(viewingId), { body: 'Hi' })).status).toBe(
      403,
    );
    expect((await otherLandlord.get(messages(viewingId))).status).toBe(403);
    expect((await agent.get(messages(viewingId))).status).toBe(403);
    expect((await admin.get(messages(viewingId))).status).toBe(200);
    expect((await admin.postIdempotent(messages(viewingId), { body: 'Hi' })).status).toBe(403);
    expect((await admin.get(messages(randomUUID()))).status).toBe(404);
    expect(
      (bodyOf(await admin.get('/api/v1/conversations')).content as unknown[]).length,
    ).toBeGreaterThanOrEqual(1);
    expect(bodyOf(await agent.get('/api/v1/conversations'))).toMatchObject({ content: [] });

    const empty = await tenant.postIdempotent(messages(viewingId), { body: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body).toMatchObject({ error: 'VALIDATION_FAILED', details: [{ field: 'body' }] });
    expect(
      (await tenant.postIdempotent(messages(viewingId), { body: 'x'.repeat(2001) })).status,
    ).toBe(400);
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
        content: [{ viewingId: held.id, open: true, unread: 0 }],
      });
      // The landlord's inbox lists the latest message first.
      const inbox = bodyOf(await landlord.get('/api/v1/conversations')).content as {
        viewingId: string;
      }[];
      expect(inbox[0]?.viewingId).toBe(held.id);
      expect(inbox[1]?.viewingId).toBe(viewingId);
    } finally {
      await db.$disconnect();
    }

    expect((await tenant.post(`/api/v1/viewings/${viewingId}/cancellation`)).status).toBe(200);
    const closed = await tenant.postIdempotent(messages(viewingId), { body: 'One more thing' });
    expect(closed.status).toBe(422);
    expect(String(bodyOf(closed).message)).toContain('closed');
    const thread = bodyOf(await tenant.get(messages(viewingId)));
    expect(thread).toMatchObject({ open: false, status: 'CANCELLED' });
    expect(thread.messages).toHaveLength(3);
    expect(
      (bodyOf(await tenant.get('/api/v1/conversations')).content as { viewingId: string }[]).some(
        (row) => row.viewingId === viewingId,
      ),
    ).toBe(true);
  });
});
