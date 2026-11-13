import { randomUUID } from 'node:crypto';
import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { FakeEmailSender } from './fake-email.sender';
import { PNG_HEAD } from './fake-object.storage';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';
import { MAX_PENDING_PHOTOS } from '../src/modules/listing/service/photo-status';

const rows = (response: { body: unknown }): Record<string, unknown>[] =>
  (bodyOf(response as never).content as Record<string, unknown>[] | undefined) ?? [];
const titles = (response: { body: unknown }): string[] =>
  rows(response).map((row) => String(row.title));

/**
 * M1: search (filters, typo-tolerant text, paging), a tenant's saved homes and searches with
 * the daily digest, and the owner's writing: create, edit, photos, publish — with the access
 * rules around them.
 */
describe('Listings and search (M1)', () => {
  let testApp: TestApp;
  let f: Fixtures;
  let tenant: Client;
  let landlord: Client;
  let agent: Client;
  let admin: Client;
  let cityId: string;

  const draft = (overrides: Record<string, unknown> = {}) => ({
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
    petsAllowed: true,
    furnished: false,
    parking: true,
    availableFrom: '2026-12-15',
    ...overrides,
  });

  beforeAll(async () => {
    testApp = await createTestApp();
    f = await createFixtures(`m1-${randomUUID().slice(0, 8)}`);
    cityId = f.cityId;
    tenant = new Client(testApp.app);
    landlord = new Client(testApp.app);
    agent = new Client(testApp.app);
    admin = new Client(testApp.app);
    for (const [client, user] of [
      [tenant, f.tenant],
      [landlord, f.landlord],
      [agent, f.agent],
      [admin, f.admin],
    ] as const) {
      expect((await client.login(user.email, PASSWORD)).status).toBe(200);
    }
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('search', () => {
    it('filters by city, rent, beds, baths, amenities and availability — published only', async () => {
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
        '/api/v1/listings?city=testville&beds=2&baths=1&pets=true&parking=true&furnished=false&priceMin=1000&priceMax=2000&availableBy=2026-12-01&size=50',
      );
      expect(bodyOf(twoBeds).totalElements).toBeGreaterThanOrEqual(2);
      const late = await tenant.get('/api/v1/listings?city=testville&availableBy=2026-11-01');
      expect(late.body).toMatchObject({ totalElements: 0 });
      // The kind leads every search: the fixtures are rentals, so "for sale" finds none.
      const forSale = await tenant.get('/api/v1/listings?city=testville&kind=SALE');
      expect(forSale.body).toMatchObject({ totalElements: 0 });
      const houses = await tenant.get('/api/v1/listings?city=testville&type=HOUSE');
      expect(houses.body).toMatchObject({ totalElements: 0 });
    });

    it('is open to visitors without an account; "saved" is false for them', async () => {
      const visitor = new Client(testApp.app);
      expect((await visitor.get('/api/v1/cities')).status).toBe(200);
      const open = await visitor.get('/api/v1/listings?city=testville&size=50');
      expect(open.status).toBe(200);
      expect(rows(open).map((row) => row.id)).toContain(f.landlordPublished);
      expect(rows(open).every((row) => row.saved === false)).toBe(true);
      // A published page opens; a draft answers 404 to a visitor, exactly like an unknown id.
      expect((await visitor.get(`/api/v1/listings/${f.landlordPublished}`)).status).toBe(200);
      expect((await visitor.get(`/api/v1/listings/${f.landlordDraft}`)).status).toBe(404);
      // Saving needs an account.
      expect((await visitor.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(401);
    });

    it('tolerates typos in the text search and sorts by price', async () => {
      const typo = await tenant.get(`/api/v1/listings?q=${encodeURIComponent('Testvile')}&size=50`);
      expect(bodyOf(typo).totalElements).toBeGreaterThanOrEqual(2);
      const nonsense = await tenant.get('/api/v1/listings?q=zzqqxxyy&size=5');
      expect(nonsense.body).toMatchObject({ totalElements: 0 });
      const byPrice = await tenant.get('/api/v1/listings?city=testville&sort=price,asc&size=50');
      const prices = rows(byPrice).map((row) => Number((row.price as { amount: string }).amount));
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('refuses a price range upside down and an unknown sort', async () => {
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

  describe('saved homes', () => {
    it('a tenant saves and unsaves; the card shows it; only published homes can be saved', async () => {
      const saved = await tenant.put(`/api/v1/saved-listings/${f.landlordPublished}`);
      expect(saved.status).toBe(200);
      expect(saved.body).toMatchObject({ listingId: f.landlordPublished, saved: true });
      expect((await tenant.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(200);

      const page = await tenant.get('/api/v1/saved-listings');
      expect(page.status).toBe(200);
      expect(rows(page).map((row) => row.id)).toEqual([f.landlordPublished]);
      const card = rows(await tenant.get('/api/v1/listings?city=testville&size=50')).find(
        (row) => row.id === f.landlordPublished,
      );
      expect(card).toMatchObject({ saved: true });

      expect((await tenant.put(`/api/v1/saved-listings/${f.landlordDraft}`)).status).toBe(404);
      expect((await landlord.put(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(
        403,
      );
      expect((await landlord.get('/api/v1/saved-listings')).status).toBe(403);

      expect((await tenant.delete(`/api/v1/saved-listings/${f.landlordPublished}`)).status).toBe(
        204,
      );
      expect((await tenant.get('/api/v1/saved-listings')).body).toMatchObject({ totalElements: 0 });
    });
  });

  describe("the owner's writing", () => {
    let listingId = '';

    it('a landlord creates a draft; a tenant and an unverified landlord cannot', async () => {
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
      listingId = String(bodyOf(created).id);

      expect((await tenant.postIdempotent('/api/v1/managed-listings', draft())).status).toBe(403);
      const unverified = new Client(testApp.app);
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

      const badCity = await landlord.postIdempotent(
        '/api/v1/managed-listings',
        draft({ cityId: randomUUID() }),
      );
      expect(badCity.status).toBe(422);
      expect(badCity.body).toMatchObject({ details: [{ field: 'cityId' }] });

      // A rental needs its move-in day; a home for sale has none, whatever the form sent.
      const noDay = await landlord.postIdempotent(
        '/api/v1/managed-listings',
        draft({ availableFrom: null }),
      );
      expect(noDay.status).toBe(400);
      expect(noDay.body).toMatchObject({ details: [{ field: 'availableFrom' }] });
      const forSale = await landlord.postIdempotent(
        '/api/v1/managed-listings',
        draft({ kind: 'SALE', price: '425000', title: 'Corner house for sale' }),
      );
      expect(forSale.status).toBe(200);
      expect(forSale.body).toMatchObject({
        kind: 'SALE',
        price: { amount: '425000.0000' },
        availableFrom: null,
      });
    });

    it('a retried create with the same Idempotency-Key does not create twice', async () => {
      const key = randomUUID();
      const first = await landlord.postIdempotent('/api/v1/managed-listings', draft(), key);
      const second = await landlord.postIdempotent('/api/v1/managed-listings', draft(), key);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(bodyOf(second).id).toBe(bodyOf(first).id);
      const reused = await landlord.postIdempotent(
        '/api/v1/managed-listings',
        draft({ title: 'Something else' }),
        key,
      );
      expect(reused.status).toBe(409);
    });

    it('edits with an optimistic lock; the agent of another owner is refused', async () => {
      const before = bodyOf(await landlord.get(`/api/v1/managed-listings/${listingId}`));
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
      expect(
        (await agent.put(`/api/v1/managed-listings/${listingId}`, { ...draft(), version: 1 }))
          .status,
      ).toBe(403);
    });

    it('cannot publish without a photo; uploads one through an intent, confirms, reorders, deletes', async () => {
      const noPhoto = await landlord.post(`/api/v1/managed-listings/${listingId}/publication`);
      expect(noPhoto.status).toBe(422);
      expect(noPhoto.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });

      const intent = async (): Promise<{ photoId: string; uploadUrl: string }> => {
        const response = await landlord.postIdempotent(
          `/api/v1/managed-listings/${listingId}/photo-intents`,
          { filename: 'front.png', contentType: 'image/png', sizeBytes: PNG_HEAD.length },
        );
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          headers: { 'Content-Type': 'image/png', 'Content-Length': String(PNG_HEAD.length) },
        });
        return {
          photoId: String(bodyOf(response).photoId),
          uploadUrl: String(bodyOf(response).uploadUrl),
        };
      };

      // An intent the browser never uploaded: confirming it is refused.
      const abandoned = await intent();
      const notUploaded = await landlord.post(
        `/api/v1/managed-listings/${listingId}/photos/${abandoned.photoId}/confirmation`,
      );
      expect(notUploaded.status).toBe(422);

      // The real thing: bytes that are a PNG, then a confirmation.
      const first = await intent();
      testApp.storage.upload(first.uploadUrl, PNG_HEAD, 'image/png');
      const confirmed = await landlord.post(
        `/api/v1/managed-listings/${listingId}/photos/${first.photoId}/confirmation`,
      );
      expect(confirmed.status).toBe(200);
      const readyAfterFirst = (
        bodyOf(confirmed).managedPhotos as { id: string; status: string; position: number | null }[]
      ).find((photo) => photo.id === first.photoId);
      expect(readyAfterFirst).toMatchObject({ status: 'READY', position: 0 });
      // Confirming again changes nothing.
      expect(
        (
          await landlord.post(
            `/api/v1/managed-listings/${listingId}/photos/${first.photoId}/confirmation`,
          )
        ).status,
      ).toBe(200);

      // Bytes that are not the announced type are refused and the object removed.
      const lie = await intent();
      testApp.storage.upload(
        lie.uploadUrl,
        new Uint8Array(PNG_HEAD.length).fill(0x41),
        'image/png',
      );
      const rejected = await landlord.post(
        `/api/v1/managed-listings/${listingId}/photos/${lie.photoId}/confirmation`,
      );
      expect(rejected.status).toBe(422);
      expect(testApp.storage.deleted.some((key) => key.includes(listingId))).toBe(true);

      const second = await intent();
      testApp.storage.upload(second.uploadUrl, PNG_HEAD, 'image/png');
      expect(
        (
          await landlord.post(
            `/api/v1/managed-listings/${listingId}/photos/${second.photoId}/confirmation`,
          )
        ).status,
      ).toBe(200);
      const reordered = await landlord.put(`/api/v1/managed-listings/${listingId}/photos`, {
        photoIds: [second.photoId, first.photoId],
      });
      expect(reordered.status).toBe(200);
      const ready = (
        bodyOf(reordered).managedPhotos as { id: string; position: number | null; status: string }[]
      )
        .filter((photo) => photo.status === 'READY')
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((photo) => photo.id);
      expect(ready).toEqual([second.photoId, first.photoId]);
      const partial = await landlord.put(`/api/v1/managed-listings/${listingId}/photos`, {
        photoIds: [first.photoId],
      });
      expect(partial.status).toBe(422);

      // Someone else cannot touch the photos.
      expect(
        (await agent.delete(`/api/v1/managed-listings/${listingId}/photos/${first.photoId}`))
          .status,
      ).toBe(403);
      expect(
        (await landlord.delete(`/api/v1/managed-listings/${listingId}/photos/${second.photoId}`))
          .status,
      ).toBe(204);
      // The ready gallery is the first photo alone; the abandoned intent stays pending until the
      // hourly cleanup removes it.
      const after = bodyOf(await landlord.get(`/api/v1/managed-listings/${listingId}`));
      const gallery = after.managedPhotos as {
        id: string;
        status: string;
        position: number | null;
      }[];
      expect(gallery.filter((p) => p.status === 'READY').map((p) => [p.id, p.position])).toEqual([
        [first.photoId, 0],
      ]);
      expect(gallery.filter((p) => p.status === 'PENDING').map((p) => p.id)).toEqual([
        abandoned.photoId,
      ]);
    });

    it('bounds the upload intents a listing can hold open', async () => {
      const own = bodyOf(
        await landlord.postIdempotent('/api/v1/managed-listings', draft({ title: 'Intent bound' })),
      );
      const open = (): Promise<{ status: number; body: unknown }> =>
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

    it('publishes, appears in search, counts a view, and the saved search mails the match', async () => {
      const search = await tenant.postIdempotent('/api/v1/saved-searches', {
        name: 'Lofts in Testville',
        emailAlerts: true,
        criteria: { city: 'testville', q: 'loft', pets: true },
      });
      expect(search.status).toBe(200);
      expect(search.body).toMatchObject({ lastNotifiedAt: null, criteria: { city: 'testville' } });
      const savedSearchId = String(bodyOf(search).id);

      const published = await landlord.post(`/api/v1/managed-listings/${listingId}/publication`);
      expect(published.status).toBe(200);
      expect(published.body).toMatchObject({ status: 'PUBLISHED' });

      const found = await tenant.get(
        `/api/v1/listings?city=testville&q=${encodeURIComponent('renamd loft')}`,
      );
      expect(titles(found)).toContain('Renamed loft');

      // The tenant opens it: no address, one view counted (once per day).
      const page = await tenant.get(`/api/v1/listings/${listingId}`);
      expect(page.status).toBe(200);
      // Three comparable rentals in Testville (the fixtures' apartments at $1,500): the median
      // comes from the city, and $2,200.50 is 47 % above it.
      expect(page.body).toMatchObject({
        address: null,
        priceContext: {
          scope: 'CITY',
          sample: 3,
          median: { amount: '1500.0000' },
          differencePercent: 47,
        },
      });
      await tenant.get(`/api/v1/listings/${listingId}`);
      expect(bodyOf(await landlord.get(`/api/v1/managed-listings/${listingId}`))).toMatchObject({
        viewCount: 1,
      });
      // A visitor without an account counts too — once a day, however often they come back.
      const visitor = new Client(testApp.app);
      await visitor.get(`/api/v1/listings/${listingId}`);
      await visitor.get(`/api/v1/listings/${listingId}`);
      expect(bodyOf(await landlord.get(`/api/v1/managed-listings/${listingId}`))).toMatchObject({
        viewCount: 2,
      });

      // The digest: admins may run it now; the scheduler runs it daily.
      expect((await tenant.post('/api/v1/saved-search-digests')).status).toBe(403);
      const sent = await admin.post('/api/v1/saved-search-digests');
      expect(sent.status).toBe(200);
      expect(bodyOf(sent).emails).toBeGreaterThanOrEqual(1);
      const mail = testApp.emails.lastTo(f.tenant.email);
      expect(mail?.subject).toContain('Lofts in Testville');
      expect(mail?.text).toContain('Renamed loft');
      expect(mail?.text).toContain(`/listings/${listingId}`);
      // A second run has nothing new.
      const again = await admin.post('/api/v1/saved-search-digests');
      expect(testApp.emails.sent.filter((m) => m.to === f.tenant.email)).toHaveLength(1);
      expect(again.status).toBe(200);

      const list = await tenant.get('/api/v1/saved-searches');
      expect(rows(list).map((row) => row.id)).toContain(savedSearchId);
      expect(typeof rows(list)[0]?.lastNotifiedAt).toBe('string');
      const renamed = await tenant.put(`/api/v1/saved-searches/${savedSearchId}`, {
        name: 'Quiet lofts',
        emailAlerts: false,
        version: bodyOf(search).version,
      });
      expect(renamed.status).toBe(200);
      expect(renamed.body).toMatchObject({ name: 'Quiet lofts', emailAlerts: false });
      const other = new Client(testApp.app);
      await other.login(f.otherLandlord.email, PASSWORD);
      expect((await other.delete(`/api/v1/saved-searches/${savedSearchId}`)).status).toBe(403);
      expect((await tenant.delete(`/api/v1/saved-searches/${savedSearchId}`)).status).toBe(204);
    });
  });

  it('similar homes, recently viewed, and cards by id', async () => {
    // The two fixture rentals are alike (2 beds, $1,500, Testville): each is the other's similar home.
    const visitor = new Client(testApp.app);
    const similar = await visitor.get(`/api/v1/listings/${f.landlordPublished}/similar`);
    expect(similar.status).toBe(200);
    const similarIds = rows(similar).map((row) => row.id);
    expect(similarIds).toContain(f.agencyPublished);
    expect(similarIds).not.toContain(f.landlordPublished);
    expect(similarIds).not.toContain(f.landlordDraft);
    expect((await visitor.get(`/api/v1/listings/${f.landlordDraft}/similar`)).status).toBe(404);

    // A visitor keeps their own list of ids; the cards come back in that order, published only.
    const cards = await visitor.get(
      `/api/v1/listing-cards?ids=${f.agencyPublished},${f.landlordDraft},${f.landlordPublished}`,
    );
    expect(cards.status).toBe(200);
    expect(rows(cards).map((row) => row.id)).toEqual([f.agencyPublished, f.landlordPublished]);
    expect((await visitor.get('/api/v1/listing-cards?ids=not-an-id')).status).toBe(400);
    expect((await visitor.get('/api/v1/recent-listings')).status).toBe(401);

    // A signed-in person's recent homes come from their views, latest first, each once.
    await tenant.get(`/api/v1/listings/${f.agencyPublished}`);
    await tenant.get(`/api/v1/listings/${f.landlordPublished}`);
    await tenant.get(`/api/v1/listings/${f.agencyPublished}`);
    const recent = await tenant.get('/api/v1/recent-listings');
    expect(recent.status).toBe(200);
    const recentIds = rows(recent).map((row) => row.id);
    expect(recentIds.filter((id) => id === f.agencyPublished)).toHaveLength(1);
    expect(recentIds.indexOf(f.landlordPublished)).toBeGreaterThanOrEqual(0);
  });

  it('a signed-out visitor browses but has no saved homes or dashboard', async () => {
    const anonymous = new Client(testApp.app);
    expect((await anonymous.get('/api/v1/listings')).status).toBe(200);
    expect((await anonymous.get('/api/v1/saved-listings')).status).toBe(401);
    expect((await anonymous.get('/api/v1/managed-listings')).status).toBe(401);
  });

  it('the fake mail transport keeps every link', () => {
    expect(() =>
      FakeEmailSender.tokenOf({ to: '', subject: '', text: 'no link', html: '' }),
    ).toThrow();
  });
});
