import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { type ApiResponse, type Client, ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD } from '../../support/db';
import { allEmails, emailAfter, emailCount, quietPeriod, tokenOf } from '../../support/mailbox';
import { deletedKeys, PNG_HEAD, upload } from '../../support/storage';

/** The backend's MAX_PENDING_PHOTOS: open upload intents a listing may hold. */
const MAX_PENDING_PHOTOS = 20;

const rows = (response: ApiResponse): Record<string, unknown>[] =>
    (response.body.content as Record<string, unknown>[] | undefined) ?? [];
const titles = (response: ApiResponse): string[] => rows(response).map((row) => String(row.title));

test.describe.configure({ mode: 'serial' });

test.describe('Listings and search (M1)', () => {
    const clients = new ClientPool();
    let f: Fixtures;
    let tenant: Client;
    let landlord: Client;
    let agent: Client;
    let admin: Client;
    let cityId: string;

    const draft = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
        title: 'Sunlit 2-bedroom loft in Testville Heights',
        description: 'A bright loft with a long balcony and a quiet street.',
        propertyType: 'APARTMENT',
        kind: 'RENT',
        price: '2150',
        bedrooms: 2,
        bathrooms: '1.5',
        sizeSqft: 980,
        addressLine1: '77 Hidden Lane',
        addressLine2: 'Unit 4',
        cityId,
        neighborhood: 'Testville Heights',
        zip: '75001',
        isPetFriendly: true,
        isFurnished: false,
        hasParking: true,
        availableAt: '2026-12-15',
        ...overrides,
    });

    test.beforeAll(async () => {
        f = await createFixtures(`m1-${randomUUID().slice(0, 8)}`);
        cityId = f.cityId;
        tenant = await clients.signedIn(f.tenant.email, PASSWORD);
        landlord = await clients.signedIn(f.landlord.email, PASSWORD);
        agent = await clients.signedIn(f.agent.email, PASSWORD);
        admin = await clients.signedIn(f.admin.email, PASSWORD);
    });

    test.afterAll(async () => {
        await clients.disposeAll();
    });

    test.describe('search', () => {
        test('filters by city, rent, beds, baths, amenities and availability — published only', async () => {
            const all = await tenant.get('/api/v1/listings?city=testville&size=50');
            expect(all.status).toBe(200);
            const ids = rows(all).map((row) => row.id);
            expect(ids).toEqual(expect.arrayContaining([f.landlordPublished, f.agencyPublished]));
            expect(ids).not.toContain(f.landlordDraft);
            expect(ids).not.toContain(f.otherLandlordUnpublished);

            const none = await tenant.get('/api/v1/listings?city=testville&priceMax=100');
            expect(none.body).toMatchObject({ totalElements: 0, content: [] });
            const beds = await tenant.get('/api/v1/listings?city=testville&beds=3');
            expect(beds.body).toMatchObject({ totalElements: 0 });
            const twoBeds = await tenant.get(
                '/api/v1/listings?city=testville&beds=2&baths=1&isPetFriendly=true&hasParking=true&isFurnished=false&priceMin=1000&priceMax=2000&moveInAt=2026-12-01&size=50',
            );
            expect(twoBeds.body.totalElements).toBeGreaterThanOrEqual(2);
            const late = await tenant.get('/api/v1/listings?city=testville&moveInAt=2026-11-01');
            expect(late.body).toMatchObject({ totalElements: 0 });
            const forSale = await tenant.get('/api/v1/listings?city=testville&kind=SALE');
            expect(forSale.body).toMatchObject({ totalElements: 0 });
            const houses = await tenant.get('/api/v1/listings?city=testville&type=HOUSE');
            expect(houses.body).toMatchObject({ totalElements: 0 });
        });

        test('is open to visitors without an account; "saved" is false for them', async () => {
            const visitor = await clients.open();
            expect((await visitor.get('/api/v1/cities')).status).toBe(200);
            const open = await visitor.get('/api/v1/listings?city=testville&size=50');
            expect(open.status).toBe(200);
            expect(rows(open).map((row) => row.id)).toContain(f.landlordPublished);
            expect(rows(open).every((row) => row.isSaved === false)).toBe(true);
            expect((await visitor.get(`/api/v1/listings/${f.landlordPublished}`)).status).toBe(200);
            expect((await visitor.get(`/api/v1/listings/${f.landlordDraft}`)).status).toBe(404);
            expect((await visitor.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(401);
        });

        test('tolerates typos in the text search and sorts by price', async () => {
            const typo = await tenant.get(`/api/v1/listings?q=${encodeURIComponent('Testvile')}&size=50`);
            expect(typo.body.totalElements).toBeGreaterThanOrEqual(2);
            const nonsense = await tenant.get('/api/v1/listings?q=zzqqxxyy&size=5');
            expect(nonsense.body).toMatchObject({ totalElements: 0 });
            const byPrice = await tenant.get('/api/v1/listings?city=testville&sort=price,asc&size=50');
            const prices = rows(byPrice).map((row) => Number((row.price as { amount: string }).amount));
            expect(prices).toEqual([...prices].sort((a, b) => a - b));
        });

        test('refuses a price range upside down and an unknown sort', async () => {
            const upsideDown = await tenant.get('/api/v1/listings?priceMin=3000&priceMax=1000');
            expect(upsideDown.status).toBe(400);
            expect(upsideDown.body).toMatchObject({
                error: 'VALIDATION_FAILED',
                details: [{ field: 'priceMax' }],
            });
            expect((await tenant.get('/api/v1/listings?kind=LEASE')).status).toBe(400);
            expect((await tenant.get('/api/v1/listings?sort=title,asc')).status).toBe(400);
        });
    });

    test.describe('saved homes', () => {
        test('a tenant saves and unsaves; the card shows it; only published homes can be saved', async () => {
            const saved = await tenant.put(`/api/v1/saved-listings/${f.landlordPublished}`);
            expect(saved.status).toBe(200);
            expect(saved.body).toMatchObject({ listingId: f.landlordPublished, isSaved: true });
            expect((await tenant.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(200);

            const page = await tenant.get('/api/v1/saved-listings');
            expect(page.status).toBe(200);
            expect(rows(page).map((row) => row.id)).toEqual([f.landlordPublished]);
            const card = rows(await tenant.get('/api/v1/listings?city=testville&size=50')).find(
                (row) => row.id === f.landlordPublished,
            );
            expect(card).toMatchObject({ isSaved: true });

            expect((await tenant.put(`/api/v1/saved-listings/${f.landlordDraft}`)).status).toBe(404);
            expect((await landlord.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(403);
            expect((await landlord.get('/api/v1/saved-listings')).status).toBe(403);

            expect((await tenant.delete(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(204);
            expect((await tenant.get('/api/v1/saved-listings')).body).toMatchObject({ totalElements: 0 });
        });
    });

    test.describe("the owner's writing", () => {
        let listingId = '';

        test('a landlord creates a draft; a tenant and an unverified landlord cannot', async () => {
            const created = await landlord.postIdempotent('/api/v1/managed-listings', draft());
            expect(created.status).toBe(200);
            expect(created.body).toMatchObject({
                status: 'DRAFT',
                listedBy: { kind: 'LANDLORD' },
                address: { line1: '77 Hidden Lane', line2: 'Unit 4' },
                viewCount: 0,
                saveCount: 0,
                managedPhotos: [],
            });
            listingId = String(created.body.id);

            expect((await tenant.postIdempotent('/api/v1/managed-listings', draft())).status).toBe(403);
            const unverified = await clients.open();
            const email = `fresh-${randomUUID().slice(0, 8)}@test.example`;
            await unverified.post('/api/v1/registrations', {
                firstName: 'Fresh',
                lastName: 'Landlord',
                email,
                password: PASSWORD,
                role: 'LANDLORD',
            });
            const refused = await unverified.postIdempotent('/api/v1/managed-listings', draft());
            expect(refused.status).toBe(403);
            expect(refused.body).toMatchObject({ error: 'EMAIL_NOT_VERIFIED' });

            const badCity = await landlord.postIdempotent('/api/v1/managed-listings', draft({ cityId: randomUUID() }));
            expect(badCity.status).toBe(422);
            expect(badCity.body).toMatchObject({ details: [{ field: 'cityId' }] });

            const noDay = await landlord.postIdempotent('/api/v1/managed-listings', draft({ availableAt: null }));
            expect(noDay.status).toBe(400);
            expect(noDay.body).toMatchObject({ details: [{ field: 'availableAt' }] });
            const forSale = await landlord.postIdempotent(
                '/api/v1/managed-listings',
                draft({ kind: 'SALE', price: '425000', title: 'Corner house for sale' }),
            );
            expect(forSale.status).toBe(200);
            expect(forSale.body).toMatchObject({
                kind: 'SALE',
                price: { amount: '425000.0000' },
                availableAt: null,
            });
        });

        test('a retried create with the same Idempotency-Key does not create twice', async () => {
            const key = randomUUID();
            const first = await landlord.postIdempotent('/api/v1/managed-listings', draft(), key);
            const second = await landlord.postIdempotent('/api/v1/managed-listings', draft(), key);
            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(second.body.id).toBe(first.body.id);
            const reused = await landlord.postIdempotent(
                '/api/v1/managed-listings',
                draft({ title: 'Something else' }),
                key,
            );
            expect(reused.status).toBe(409);
        });

        test('edits with an optimistic lock; the agent of another owner is refused', async () => {
            const before = (await landlord.get(`/api/v1/managed-listings/${listingId}`)).body;
            const edited = await landlord.put(`/api/v1/managed-listings/${listingId}`, {
                ...draft({ title: 'Renamed loft', price: '2200.50' }),
                version: before.version,
            });
            expect(edited.status).toBe(200);
            expect(edited.body).toMatchObject({ title: 'Renamed loft', price: { amount: '2200.5000' } });
            const stale = await landlord.put(`/api/v1/managed-listings/${listingId}`, {
                ...draft(),
                version: before.version,
            });
            expect(stale.status).toBe(409);
            expect(stale.body).toMatchObject({ error: 'CONCURRENT_MODIFICATION' });
            expect((await agent.put(`/api/v1/managed-listings/${listingId}`, { ...draft(), version: 1 })).status).toBe(
                403,
            );
        });

        test('cannot publish without a photo; uploads one through an intent, confirms, reorders, deletes', async () => {
            const noPhoto = await landlord.post(`/api/v1/managed-listings/${listingId}/publication`);
            expect(noPhoto.status).toBe(422);
            expect(noPhoto.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });

            const intent = async (): Promise<{
                photoId: string;
                uploadUrl: string;
                headers: Record<string, string>;
            }> => {
                const response = await landlord.postIdempotent(`/api/v1/managed-listings/${listingId}/photo-intents`, {
                    filename: 'front.png',
                    contentType: 'image/png',
                    sizeBytes: PNG_HEAD.length,
                });
                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    headers: { 'Content-Type': 'image/png', 'Content-Length': String(PNG_HEAD.length) },
                });
                return {
                    photoId: String(response.body.photoId),
                    uploadUrl: String(response.body.uploadUrl),
                    headers: response.body.headers as Record<string, string>,
                };
            };

            const abandoned = await intent();
            const notUploaded = await landlord.post(
                `/api/v1/managed-listings/${listingId}/photos/${abandoned.photoId}/confirmation`,
            );
            expect(notUploaded.status).toBe(422);

            const first = await intent();
            expect(await upload(first.uploadUrl, PNG_HEAD, first.headers)).toBe(200);
            const confirmed = await landlord.post(
                `/api/v1/managed-listings/${listingId}/photos/${first.photoId}/confirmation`,
            );
            expect(confirmed.status).toBe(200);
            const readyAfterFirst = (
                confirmed.body.managedPhotos as { id: string; status: string; position: number | null }[]
            ).find((photo) => photo.id === first.photoId);
            expect(readyAfterFirst).toMatchObject({ status: 'READY', position: 0 });
            expect(
                (await landlord.post(`/api/v1/managed-listings/${listingId}/photos/${first.photoId}/confirmation`))
                    .status,
            ).toBe(200);

            const lie = await intent();
            expect(await upload(lie.uploadUrl, new Uint8Array(PNG_HEAD.length).fill(0x41), lie.headers)).toBe(200);
            const rejected = await landlord.post(
                `/api/v1/managed-listings/${listingId}/photos/${lie.photoId}/confirmation`,
            );
            expect(rejected.status).toBe(422);
            expect((await deletedKeys()).some((key) => key.includes(listingId))).toBe(true);

            const second = await intent();
            expect(await upload(second.uploadUrl, PNG_HEAD, second.headers)).toBe(200);
            expect(
                (await landlord.post(`/api/v1/managed-listings/${listingId}/photos/${second.photoId}/confirmation`))
                    .status,
            ).toBe(200);
            const reordered = await landlord.put(`/api/v1/managed-listings/${listingId}/photos`, {
                photoIds: [second.photoId, first.photoId],
            });
            expect(reordered.status).toBe(200);
            const ready = (reordered.body.managedPhotos as { id: string; position: number | null; status: string }[])
                .filter((photo) => photo.status === 'READY')
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((photo) => photo.id);
            expect(ready).toEqual([second.photoId, first.photoId]);
            const partial = await landlord.put(`/api/v1/managed-listings/${listingId}/photos`, {
                photoIds: [first.photoId],
            });
            expect(partial.status).toBe(422);

            expect((await agent.delete(`/api/v1/managed-listings/${listingId}/photos/${first.photoId}`)).status).toBe(
                403,
            );
            expect(
                (await landlord.delete(`/api/v1/managed-listings/${listingId}/photos/${second.photoId}`)).status,
            ).toBe(204);
            const after = (await landlord.get(`/api/v1/managed-listings/${listingId}`)).body;
            const gallery = after.managedPhotos as {
                id: string;
                status: string;
                position: number | null;
            }[];
            expect(gallery.filter((p) => p.status === 'READY').map((p) => [p.id, p.position])).toEqual([
                [first.photoId, 0],
            ]);
            expect(gallery.filter((p) => p.status === 'PENDING').map((p) => p.id)).toEqual([abandoned.photoId]);
        });

        test('bounds the upload intents a listing can hold open', async () => {
            const own = (await landlord.postIdempotent('/api/v1/managed-listings', draft({ title: 'Intent bound' })))
                .body;
            const open = (): Promise<ApiResponse> =>
                landlord.postIdempotent(`/api/v1/managed-listings/${String(own.id)}/photo-intents`, {
                    filename: 'x.png',
                    contentType: 'image/png',
                    sizeBytes: PNG_HEAD.length,
                });
            for (let i = 0; i < MAX_PENDING_PHOTOS; i += 1) {
                expect((await open()).status).toBe(200);
            }
            const refused = await open();
            expect(refused.status).toBe(422);
            expect(refused.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });
        });

        test('publishes, appears in search, counts a view, and the saved search mails the match', async () => {
            const search = await tenant.postIdempotent('/api/v1/saved-searches', {
                name: 'Lofts in Testville',
                hasEmailAlerts: true,
                criteria: { city: 'testville', q: 'loft', isPetFriendly: true },
            });
            expect(search.status).toBe(200);
            expect(search.body).toMatchObject({ lastNotifiedAt: null, criteria: { city: 'testville' } });
            const savedSearchId = String(search.body.id);

            const published = await landlord.post(`/api/v1/managed-listings/${listingId}/publication`);
            expect(published.status).toBe(200);
            expect(published.body).toMatchObject({ status: 'PUBLISHED' });

            const found = await tenant.get(`/api/v1/listings?city=testville&q=${encodeURIComponent('renamd loft')}`);
            expect(titles(found)).toContain('Renamed loft');

            const page = await tenant.get(`/api/v1/listings/${listingId}`);
            expect(page.status).toBe(200);
            expect(page.body).toMatchObject({
                address: null,
                priceContext: { scope: 'CITY', median: { amount: '1500.0000' }, differencePercent: 47 },
            });
            const context = page.body.priceContext as { sample: number };
            expect(context.sample).toBeGreaterThanOrEqual(5);
            expect(context.sample % 5).toBe(0);
            await tenant.get(`/api/v1/listings/${listingId}`);
            expect((await landlord.get(`/api/v1/managed-listings/${listingId}`)).body).toMatchObject({
                viewCount: 1,
            });
            const visitor = await clients.open();
            await visitor.get(`/api/v1/listings/${listingId}`);
            await visitor.get(`/api/v1/listings/${listingId}`);
            expect((await landlord.get(`/api/v1/managed-listings/${listingId}`)).body).toMatchObject({
                viewCount: 2,
            });
            expect((await tenant.get(`/api/v1/listings/${listingId}`)).body).toMatchObject({
                viewCount: 2,
            });

            expect((await tenant.post('/api/v1/saved-search-digests')).status).toBe(403);
            const before = await emailCount();
            const sent = await admin.post('/api/v1/saved-search-digests');
            expect(sent.status).toBe(200);
            expect(sent.body.emails).toBeGreaterThanOrEqual(1);
            const mail = await emailAfter(f.tenant.email, before);
            expect(mail.subject).toContain('Lofts in Testville');
            expect(mail.text).toContain('Renamed loft');
            expect(mail.text).toContain(`/listings/${listingId}`);
            const again = await admin.post('/api/v1/saved-search-digests');
            await quietPeriod();
            expect((await allEmails()).filter((m) => m.to.includes(f.tenant.email))).toHaveLength(1);
            expect(again.status).toBe(200);

            const list = await tenant.get('/api/v1/saved-searches');
            expect(rows(list).map((row) => row.id)).toContain(savedSearchId);
            expect(typeof rows(list)[0]?.lastNotifiedAt).toBe('string');
            const renamed = await tenant.put(`/api/v1/saved-searches/${savedSearchId}`, {
                name: 'Quiet lofts',
                hasEmailAlerts: false,
                version: search.body.version,
            });
            expect(renamed.status).toBe(200);
            expect(renamed.body).toMatchObject({ name: 'Quiet lofts', hasEmailAlerts: false });
            const other = await clients.open();
            await other.login(f.otherLandlord.email, PASSWORD);
            expect((await other.delete(`/api/v1/saved-searches/${savedSearchId}`)).status).toBe(403);
            expect((await tenant.delete(`/api/v1/saved-searches/${savedSearchId}`)).status).toBe(204);
        });
    });

    test('similar homes, recently viewed, and cards by id', async () => {
        const visitor = await clients.open();
        const similar = await visitor.get(`/api/v1/listings/${f.landlordPublished}/similar`);
        expect(similar.status).toBe(200);
        const similarIds = rows(similar).map((row) => row.id);
        expect(similarIds).toContain(f.agencyPublished);
        expect(similarIds).not.toContain(f.landlordPublished);
        expect(similarIds).not.toContain(f.landlordDraft);
        expect((await visitor.get(`/api/v1/listings/${f.landlordDraft}/similar`)).status).toBe(404);

        const cards = await visitor.get(
            `/api/v1/listing-cards?ids=${f.agencyPublished},${f.landlordDraft},${f.landlordPublished}`,
        );
        expect(cards.status).toBe(200);
        expect(rows(cards).map((row) => row.id)).toEqual([f.agencyPublished, f.landlordPublished]);
        expect((await visitor.get('/api/v1/listing-cards?ids=not-an-id')).status).toBe(400);
        expect((await visitor.get('/api/v1/recent-listings')).status).toBe(401);

        await tenant.get(`/api/v1/listings/${f.agencyPublished}`);
        await tenant.get(`/api/v1/listings/${f.landlordPublished}`);
        await tenant.get(`/api/v1/listings/${f.agencyPublished}`);
        const recent = await tenant.get('/api/v1/recent-listings');
        expect(recent.status).toBe(200);
        const recentIds = rows(recent).map((row) => row.id);
        expect(recentIds.filter((id) => id === f.agencyPublished)).toHaveLength(1);
        expect(recentIds.indexOf(f.landlordPublished)).toBeGreaterThanOrEqual(0);
    });

    test('a signed-out visitor browses but has no saved homes or dashboard', async () => {
        const anonymous = await clients.open();
        expect((await anonymous.get('/api/v1/listings')).status).toBe(200);
        expect((await anonymous.get('/api/v1/saved-listings')).status).toBe(401);
        expect((await anonymous.get('/api/v1/managed-listings')).status).toBe(401);
    });

    test('the fake mail transport keeps every link', () => {
        expect(() => tokenOf({ to: [], subject: '', text: 'no link', html: '' })).toThrow();
    });
});
