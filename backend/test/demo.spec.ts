import './demo-env';

import { randomUUID } from 'node:crypto';

import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { DEMO_RUN } from './demo-env';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';

describe('Public demo: showcase listings are read-only', () => {
    let testApp: TestApp;
    let f: Fixtures;
    let landlord: Client;
    let agent: Client;
    let admin: Client;

    beforeAll(async () => {
        testApp = await createTestApp();
        f = await createFixtures(DEMO_RUN);
        landlord = new Client(testApp.app);
        agent = new Client(testApp.app);
        admin = new Client(testApp.app);
        for (const [client, user] of [
            [landlord, f.landlord],
            [agent, f.agent],
            [admin, f.admin],
        ] as const) {
            expect((await client.login(user.email, PASSWORD)).status).toBe(200);
        }
    });

    afterAll(async () => {
        await testApp.close();
        process.env.DEMO_MODE = 'false';
        process.env.DEMO_PROTECTED_EMAILS = '';
    });

    const edit = (version: number) => ({
        title: 'Renamed showcase home',
        description: 'A bright loft with a long balcony and a quiet street.',
        propertyType: 'APARTMENT',
        kind: 'RENT',
        price: '2150',
        bedrooms: 2,
        bathrooms: '1.5',
        sizeSqft: 980,
        addressLine1: '77 Hidden Lane',
        addressLine2: null,
        cityId: f.cityId,
        neighborhood: 'Testville Heights',
        zip: '75001',
        isPetFriendly: true,
        isFurnished: false,
        hasParking: true,
        availableAt: '2026-12-15',
        version,
    });

    it('tells the session the demo is on and flags the showcase rows', async () => {
        expect(bodyOf(await landlord.get('/api/v1/auth/me'))).toMatchObject({ isDemoMode: true });
        expect(bodyOf(await landlord.get(`/api/v1/managed-listings/${f.landlordDemo}`))).toMatchObject({
            isDemo: true,
        });
        expect(bodyOf(await landlord.get(`/api/v1/managed-listings/${f.landlordDraft}`))).toMatchObject({
            isDemo: false,
        });
        expect(bodyOf(await admin.get(`/api/v1/listings/${f.agencyDemo}`))).toMatchObject({
            isDemo: true,
        });
        const rows = bodyOf(await landlord.get('/api/v1/managed-listings')).content as {
            id: string;
            isDemo: boolean;
        }[];
        expect(rows.find((row) => row.id === f.landlordDemo)?.isDemo).toBe(true);
        expect(rows.find((row) => row.id === f.landlordDraft)?.isDemo).toBe(false);
    });

    it('refuses every write on a showcase listing with 403 DEMO_READ_ONLY', async () => {
        const base = `/api/v1/managed-listings/${f.landlordDemo}`;
        const photos = bodyOf(await landlord.get(base)).managedPhotos as { id: string }[];
        const photoId = photos[0]?.id ?? randomUUID();
        const attempts = [
            () => landlord.put(base, edit(0)),
            () => landlord.postIdempotent(`${base}/publication`, {}),
            () => landlord.postIdempotent(`${base}/unpublication`, {}),
            () =>
                landlord.postIdempotent(`${base}/photo-intents`, {
                    filename: 'x.png',
                    contentType: 'image/png',
                    sizeBytes: 100,
                }),
            () => landlord.put(`${base}/photos`, { photoIds: [photoId] }),
            () => landlord.delete(`${base}/photos/${photoId}`),
            () => agent.put(`/api/v1/managed-listings/${f.agencyDemo}`, edit(0)),
            () => admin.post(`${base}/suspension`),
        ];
        for (const attempt of attempts) {
            const response = await attempt();
            expect({ status: response.status, error: bodyOf(response).error }).toEqual({
                status: 403,
                error: 'DEMO_READ_ONLY',
            });
        }
        const foreign = await agent.put(base, edit(0));
        expect(foreign.status).toBe(403);
        expect(foreign.body).toMatchObject({ error: 'FORBIDDEN' });
    });

    it('keeps everything else writable: the owner edits and publishes, the admin suspends', async () => {
        const before = bodyOf(await landlord.get(`/api/v1/managed-listings/${f.landlordDraft}`));
        const edited = await landlord.put(`/api/v1/managed-listings/${f.landlordDraft}`, edit(Number(before.version)));
        expect(edited.status).toBe(200);
        expect(
            (await landlord.postIdempotent(`/api/v1/managed-listings/${f.landlordDraft}/publication`, {})).status,
        ).toBe(200);
        expect((await admin.post(`/api/v1/managed-listings/${f.landlordPublished}/suspension`)).status).toBe(200);
    });

    it('refuses to erase a showcase account (DEMO_RESTRICTED) and keeps it signed in', async () => {
        const showcase = new Client(testApp.app);
        expect((await showcase.login(f.tenant.email, PASSWORD)).status).toBe(200);
        expect(bodyOf(await showcase.get('/api/v1/auth/me'))).toMatchObject({ isDemoRestricted: true });
        const refused = await showcase.post('/api/v1/personal-data/erasure', { password: PASSWORD });
        expect(refused.status).toBe(403);
        expect(refused.body).toMatchObject({ error: 'DEMO_RESTRICTED' });
        expect((await showcase.get('/api/v1/auth/me')).status).toBe(200);
        expect((await showcase.get('/api/v1/personal-data')).status).toBe(200);
    });
});
