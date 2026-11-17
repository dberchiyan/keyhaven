import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';

import { PG_SESSION_OPTIONS } from '@/common/persistence/pg-pool';
import { PrismaClient } from '@/generated/prisma/client';
import { ViewingJobService } from '@/modules/viewing/service/viewing-job.service';

import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';
import { testDatabaseUrl } from './test-database';

const HOUR_MS = 3_600_000;

/** Every day 08:00–20:00 local, half-hour slots, no notice, two weeks ahead. */
const hours = (version: number | null = null) => ({
    slotMinutes: 30,
    noticeHours: 0,
    horizonDays: 14,
    windows: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: 8 * 60, end: 20 * 60 })),
    blockedDays: [],
    version,
});

interface Slot {
    startsAt: string;
    endsAt: string;
}
interface SlotDay {
    day: string;
    slots: Slot[];
}

const daysOf = (response: { body: unknown }): SlotDay[] =>
    (bodyOf(response as never).days as SlotDay[] | undefined) ?? [];

describe('Viewings (M2)', () => {
    let testApp: TestApp;
    let f: Fixtures;
    let tenant: Client;
    let otherTenant: Client;
    let landlord: Client;
    let otherLandlord: Client;
    let agent: Client;
    let admin: Client;
    let visitor: Client;

    beforeAll(async () => {
        testApp = await createTestApp();
        f = await createFixtures(`m2-${randomUUID().slice(0, 8)}`);
        tenant = new Client(testApp.app);
        otherTenant = new Client(testApp.app);
        landlord = new Client(testApp.app);
        otherLandlord = new Client(testApp.app);
        agent = new Client(testApp.app);
        admin = new Client(testApp.app);
        visitor = new Client(testApp.app);
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

    const slotsOf = async (client: Client, listingId: string, query = ''): Promise<SlotDay[]> => {
        const response = await client.get(`/api/v1/listings/${listingId}/viewing-slots${query}`);
        expect(response.status).toBe(200);
        return daysOf(response);
    };

    /** A slot on the day after tomorrow: never partly in the past, never blocked by another test. */
    const pickSlot = async (listingId: string, offset = 0): Promise<Slot> => {
        const days = await slotsOf(tenant, listingId, '?days=5');
        const slot = days[2]?.slots[offset];
        if (!slot) {
            throw new Error('No slot to pick');
        }
        return slot;
    };

    describe('hours and slots', () => {
        it('without hours the home is closed for booking; the owner opens them; everyone sees the slots', async () => {
            const closed = await tenant.get(`/api/v1/listings/${f.landlordPublished}/viewing-slots`);
            expect(closed.status).toBe(200);
            expect(closed.body).toMatchObject({ isOpen: false, days: [] });
            expect(
                (await tenant.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, hours())).status,
            ).toBe(403);
            expect(
                (await otherLandlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, hours()))
                    .status,
            ).toBe(403);

            const saved = await landlord.put(
                `/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`,
                hours(),
            );
            expect(saved.status).toBe(200);
            expect(saved.body).toMatchObject({
                slotMinutes: 30,
                horizonDays: 14,
                version: 0,
                timeZone: 'America/Chicago',
            });

            const state = await landlord.get(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`);
            expect(state.body).toMatchObject({ schedule: { version: 0 }, timeZone: 'America/Chicago' });

            const open = await visitor.get(`/api/v1/listings/${f.landlordPublished}/viewing-slots?days=3`);
            expect(open.status).toBe(200);
            expect(open.body).toMatchObject({ isOpen: true, slotMinutes: 30, timeZone: 'America/Chicago' });
            const days = daysOf(open);
            expect(days).toHaveLength(3);
            expect(days[1]?.slots).toHaveLength(24);
            const first = days[1]?.slots[0];
            expect(first && new Date(first.endsAt).getTime() - new Date(first.startsAt).getTime()).toBe(30 * 60_000);
            expect((await visitor.get(`/api/v1/listings/${f.landlordDraft}/viewing-slots`)).status).toBe(404);
            expect((await visitor.get(`/api/v1/listings/${f.landlordPublished}/viewing-slots?days=15`)).status).toBe(
                400,
            );
        });

        it('refuses overlapping windows, a stale version and a blocked day drops its slots', async () => {
            const overlapping = await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, {
                ...hours(0),
                windows: [
                    { weekday: 1, start: 9 * 60, end: 12 * 60 },
                    { weekday: 1, start: 11 * 60, end: 14 * 60 },
                ],
            });
            expect(overlapping.status).toBe(400);
            expect(overlapping.body).toMatchObject({ error: 'VALIDATION_FAILED' });
            expect(
                (await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, hours(7)))
                    .status,
            ).toBe(409);

            const days = await slotsOf(tenant, f.landlordPublished, '?days=4');
            const blocked = days[3]?.day ?? '';
            const updated = await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, {
                ...hours(0),
                blockedDays: [blocked],
            });
            expect(updated.status).toBe(200);
            expect(updated.body).toMatchObject({ version: 1, blockedDays: [blocked] });
            const after = await slotsOf(tenant, f.landlordPublished, '?days=4');
            expect(after[3]).toMatchObject({ day: blocked, slots: [] });
            expect(
                (await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, hours(1)))
                    .status,
            ).toBe(200);
        });
    });

    describe('a request and the owner’s answer', () => {
        let viewingId = '';
        let slot: Slot;

        it('a tenant asks for a slot; it is held; the owner is told; both sides see what they may', async () => {
            slot = await pickSlot(f.landlordPublished);
            expect(
                (
                    await landlord.postIdempotent('/api/v1/viewings', {
                        listingId: f.landlordPublished,
                        startsAt: slot.startsAt,
                    })
                ).status,
            ).toBe(403);
            const requested = await tenant.postIdempotent('/api/v1/viewings', {
                listingId: f.landlordPublished,
                startsAt: slot.startsAt,
                message: 'We are two, moving in January.',
            });
            expect(requested.status).toBe(200);
            expect(requested.body).toMatchObject({
                status: 'REQUESTED',
                startsAt: slot.startsAt,
                message: 'We are two, moving in January.',
                tenant: null,
                listing: { id: f.landlordPublished, address: null },
            });
            viewingId = String(bodyOf(requested).id);

            const mail = testApp.emails.lastTo(f.landlord.email);
            expect(mail?.subject).toContain('Viewing request');
            expect(mail?.text).toContain('moving in January');

            const days = await slotsOf(otherTenant, f.landlordPublished, '?days=5');
            expect(days[2]?.slots.some((candidate) => candidate.startsAt === slot.startsAt)).toBe(false);
            const again = await tenant.postIdempotent('/api/v1/viewings', {
                listingId: f.landlordPublished,
                startsAt: days[2]?.slots[0]?.startsAt,
            });
            expect(again.status).toBe(422);
            expect(String(bodyOf(again).message)).toContain('already have a viewing');

            const owners = await landlord.get('/api/v1/managed-viewings?status=REQUESTED');
            expect(owners.status).toBe(200);
            expect(owners.body).toMatchObject({
                totalElements: 1,
                content: [
                    {
                        id: viewingId,
                        tenant: { email: f.tenant.email },
                        listing: { address: { line1: '1 Secret St' } },
                    },
                ],
            });
            expect(bodyOf(await landlord.get('/api/v1/managed-viewings/summary'))).toMatchObject({
                requested: 1,
                upcoming: 0,
            });
            const own = await tenant.get('/api/v1/viewings');
            expect(own.body).toMatchObject({ content: [{ id: viewingId, listing: { address: null } }] });
            expect((await otherLandlord.get(`/api/v1/viewings/${viewingId}`)).status).toBe(403);
            expect((await agent.get(`/api/v1/viewings/${viewingId}`)).status).toBe(403);
            expect((await otherTenant.get(`/api/v1/viewings/${viewingId}`)).status).toBe(403);
            expect((await admin.get(`/api/v1/viewings/${viewingId}`)).status).toBe(200);
            expect((await admin.get(`/api/v1/viewings/${randomUUID()}`)).status).toBe(404);
            expect(bodyOf(await agent.get('/api/v1/managed-viewings'))).toMatchObject({
                totalElements: 0,
            });
            expect(bodyOf(await admin.get('/api/v1/managed-viewings')).totalElements).toBeGreaterThanOrEqual(1);
        });

        it('refuses a time the hours do not offer, and a past one', async () => {
            const odd = new Date(new Date(slot.startsAt).getTime() + 7 * 60_000).toISOString();
            const refused = await otherTenant.postIdempotent('/api/v1/viewings', {
                listingId: f.landlordPublished,
                startsAt: odd,
            });
            expect(refused.status).toBe(422);
            expect(refused.body).toMatchObject({ details: [{ field: 'startsAt' }] });
            const past = await otherTenant.postIdempotent('/api/v1/viewings', {
                listingId: f.landlordPublished,
                startsAt: new Date(Date.now() - HOUR_MS).toISOString(),
            });
            expect(past.status).toBe(422);
            const closed = await otherTenant.postIdempotent('/api/v1/viewings', {
                listingId: f.agencyPublished,
                startsAt: slot.startsAt,
            });
            expect(closed.status).toBe(422);
            expect(String(bodyOf(closed).message)).toContain('no viewing hours');
        });

        it('only the owner confirms; the tenant then sees the address on the viewing and on the home', async () => {
            expect((await tenant.post(`/api/v1/viewings/${viewingId}/confirmation`)).status).toBe(403);
            expect((await otherLandlord.post(`/api/v1/viewings/${viewingId}/confirmation`)).status).toBe(403);
            expect((await admin.post(`/api/v1/viewings/${viewingId}/confirmation`)).status).toBe(403);
            const before = await tenant.get(`/api/v1/listings/${f.landlordPublished}`);
            expect(before.body).toMatchObject({ address: null });

            const confirmed = await landlord.post(`/api/v1/viewings/${viewingId}/confirmation`);
            expect(confirmed.status).toBe(200);
            expect(confirmed.body).toMatchObject({ status: 'CONFIRMED' });
            expect(typeof bodyOf(confirmed).decidedAt).toBe('string');
            const mail = testApp.emails.lastTo(f.tenant.email);
            expect(mail?.subject).toContain('Confirmed');
            expect(mail?.text).toContain('1 Secret St');
            expect((await landlord.post(`/api/v1/viewings/${viewingId}/confirmation`)).status).toBe(200);
            expect(
                (
                    await landlord.post(`/api/v1/viewings/${viewingId}/declination`, {
                        note: 'Changed my mind',
                    })
                ).status,
            ).toBe(422);

            expect(bodyOf(await tenant.get(`/api/v1/viewings/${viewingId}`))).toMatchObject({
                status: 'CONFIRMED',
                listing: { address: { line1: '1 Secret St' } },
            });
            expect(bodyOf(await tenant.get(`/api/v1/listings/${f.landlordPublished}`))).toMatchObject({
                address: { line1: '1 Secret St' },
            });
            expect(bodyOf(await otherTenant.get(`/api/v1/listings/${f.landlordPublished}`))).toMatchObject({
                address: null,
            });
            expect(bodyOf(await landlord.get('/api/v1/managed-viewings/summary'))).toMatchObject({
                requested: 0,
                upcoming: 1,
            });
            expect(
                bodyOf(await landlord.get(`/api/v1/managed-listings/${f.landlordPublished}/viewings`)),
            ).toMatchObject({
                content: [{ id: viewingId, status: 'CONFIRMED' }],
            });
        });

        it('the owner cancels a confirmed viewing with a note; the slot opens again; the tenant is told', async () => {
            const cancelled = await landlord.post(`/api/v1/viewings/${viewingId}/cancellation`, {
                note: 'Pipes burst, sorry.',
            });
            expect(cancelled.status).toBe(200);
            expect(cancelled.body).toMatchObject({
                status: 'CANCELLED',
                cancelledBy: 'OWNER',
                note: 'Pipes burst, sorry.',
            });
            expect(testApp.emails.lastTo(f.tenant.email)?.subject).toContain('Cancelled');
            expect((await tenant.post(`/api/v1/viewings/${viewingId}/cancellation`)).status).toBe(200);
            expect((await landlord.post(`/api/v1/viewings/${viewingId}/confirmation`)).status).toBe(422);
            const days = await slotsOf(otherTenant, f.landlordPublished, '?days=5');
            expect(days[2]?.slots.some((candidate) => candidate.startsAt === slot.startsAt)).toBe(true);
        });

        it('a declined request leaves the tenant free to ask for another time; a tenant cancels their own', async () => {
            const first = await pickSlot(f.landlordPublished);
            const requested = await tenant.postIdempotent('/api/v1/viewings', {
                listingId: f.landlordPublished,
                startsAt: first.startsAt,
            });
            expect(requested.status).toBe(200);
            const id = String(bodyOf(requested).id);
            const declined = await landlord.post(`/api/v1/viewings/${id}/declination`, {
                note: 'Already let.',
            });
            expect(declined.status).toBe(200);
            expect(declined.body).toMatchObject({ status: 'DECLINED', note: 'Already let.' });
            expect(testApp.emails.lastTo(f.tenant.email)?.text).toContain('Already let.');
            expect((await tenant.post(`/api/v1/viewings/${id}/cancellation`)).status).toBe(422);

            const second = await pickSlot(f.landlordPublished, 1);
            const again = await tenant.postIdempotent('/api/v1/viewings', {
                listingId: f.landlordPublished,
                startsAt: second.startsAt,
            });
            expect(again.status).toBe(200);
            const cancelled = await tenant.post(`/api/v1/viewings/${String(bodyOf(again).id)}/cancellation`, {
                note: 'Found a place.',
            });
            expect(cancelled.status).toBe(200);
            expect(cancelled.body).toMatchObject({ status: 'CANCELLED', cancelledBy: 'TENANT' });
            expect(testApp.emails.lastTo(f.landlord.email)?.subject).toContain('Cancelled');
        });
    });

    describe('no double booking', () => {
        it('two tenants race for one slot: one gets it, the other answers 409 VIEWING_SLOT_TAKEN', async () => {
            const slot = await pickSlot(f.landlordPublished, 5);
            const body = { listingId: f.landlordPublished, startsAt: slot.startsAt };
            const [first, second] = await Promise.all([
                tenant.postIdempotent('/api/v1/viewings', body),
                otherTenant.postIdempotent('/api/v1/viewings', body),
            ]);
            const statuses = [first.status, second.status].sort();
            expect(statuses).toEqual([200, 409]);
            const loser = first.status === 409 ? first : second;
            expect(loser.body).toMatchObject({ error: 'VIEWING_SLOT_TAKEN' });
            const winner = first.status === 200 ? first : second;
            expect((await landlord.post(`/api/v1/viewings/${String(bodyOf(winner).id)}/declination`)).status).toBe(200);
        });
    });

    describe('the scheduler', () => {
        const prisma = () =>
            new PrismaClient({
                adapter: new PrismaPg({ connectionString: testDatabaseUrl(), options: PG_SESSION_OPTIONS }),
            });

        it('expires a request whose slot started unanswered, and reminds both sides a day before', async () => {
            const db = prisma();
            try {
                const stale = await db.viewing.create({
                    data: {
                        listingId: f.landlordPublished,
                        tenantId: f.otherTenant.id,
                        startsAt: new Date(Date.now() - 2 * HOUR_MS),
                        endsAt: new Date(Date.now() - 1.5 * HOUR_MS),
                        status: 'REQUESTED',
                    },
                    select: { id: true },
                });
                const soon = await db.viewing.create({
                    data: {
                        listingId: f.landlordPublished,
                        tenantId: f.tenant.id,
                        startsAt: new Date(Date.now() + 20 * HOUR_MS),
                        endsAt: new Date(Date.now() + 20.5 * HOUR_MS),
                        status: 'CONFIRMED',
                        decidedAt: new Date(),
                    },
                    select: { id: true },
                });
                const service = testApp.app.get(ViewingJobService);
                expect(await service.expireUnansweredNow(new Date())).toBeGreaterThanOrEqual(1);
                expect(bodyOf(await otherTenant.get(`/api/v1/viewings/${stale.id}`))).toMatchObject({
                    status: 'EXPIRED',
                });

                const before = testApp.emails.sent.length;
                expect(await service.sendReminders(new Date())).toBe(1);
                expect(testApp.emails.sent.length).toBe(before + 2);
                expect(testApp.emails.lastTo(f.tenant.email)?.subject).toContain('Tomorrow');
                expect(testApp.emails.lastTo(f.landlord.email)?.subject).toContain('Tomorrow');
                expect(await service.sendReminders(new Date())).toBe(0);
                expect((await tenant.post(`/api/v1/viewings/${soon.id}/cancellation`)).status).toBe(200);
            } finally {
                await db.$disconnect();
            }
        });
    });

    describe('closing the hours', () => {
        it('the owner removes the hours: nothing more to book, past viewings untouched', async () => {
            expect(
                (await tenant.delete(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`)).status,
            ).toBe(403);
            expect(
                (await landlord.delete(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`)).status,
            ).toBe(204);
            expect(bodyOf(await tenant.get(`/api/v1/listings/${f.landlordPublished}/viewing-slots`))).toMatchObject({
                isOpen: false,
            });
            expect(
                bodyOf(await landlord.get(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`)),
            ).toMatchObject({ schedule: null });
            expect(bodyOf(await admin.get('/api/v1/managed-viewings')).totalElements).toBeGreaterThanOrEqual(4);
        });
    });
});
