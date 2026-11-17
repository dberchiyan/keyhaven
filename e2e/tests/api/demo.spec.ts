import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { type ApiResponse, type Client, ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD } from '../../support/db';
import { DEMO_BACKEND_URL, DEMO_RUN } from '../../support/stack';

test.describe.configure({ mode: 'serial' });

test.describe('Public demo: showcase listings are read-only', () => {
    const clients = new ClientPool(DEMO_BACKEND_URL);
    let f: Fixtures;
    let landlord: Client;
    let agent: Client;
    let admin: Client;

    test.beforeAll(async () => {
        f = await createFixtures(DEMO_RUN);
        landlord = await clients.signedIn(f.landlord.email, PASSWORD);
        agent = await clients.signedIn(f.agent.email, PASSWORD);
        admin = await clients.signedIn(f.admin.email, PASSWORD);
    });

    test.afterAll(async () => {
        await clients.disposeAll();
    });

    const edit = (version: number): Record<string, unknown> => ({
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

    test('tells the session the demo is on and flags the showcase rows', async () => {
        expect((await landlord.get('/api/v1/auth/me')).body).toMatchObject({ isDemoMode: true });
        expect((await landlord.get(`/api/v1/managed-listings/${f.landlordDemo}`)).body).toMatchObject({
            isDemo: true,
        });
        expect((await landlord.get(`/api/v1/managed-listings/${f.landlordDraft}`)).body).toMatchObject({
            isDemo: false,
        });
        expect((await admin.get(`/api/v1/listings/${f.agencyDemo}`)).body).toMatchObject({
            isDemo: true,
        });
        const rows = (await landlord.get('/api/v1/managed-listings')).body.content as {
            id: string;
            isDemo: boolean;
        }[];
        expect(rows.find((row) => row.id === f.landlordDemo)?.isDemo).toBe(true);
        expect(rows.find((row) => row.id === f.landlordDraft)?.isDemo).toBe(false);
    });

    test('refuses every write on a showcase listing with 403 DEMO_READ_ONLY', async () => {
        const base = `/api/v1/managed-listings/${f.landlordDemo}`;
        const photos = (await landlord.get(base)).body.managedPhotos as { id: string }[];
        const photoId = photos[0]?.id ?? randomUUID();
        const attempts: (() => Promise<ApiResponse>)[] = [
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
            expect({ status: response.status, error: response.body.error }).toEqual({
                status: 403,
                error: 'DEMO_READ_ONLY',
            });
        }
        const foreign = await agent.put(base, edit(0));
        expect(foreign.status).toBe(403);
        expect(foreign.body).toMatchObject({ error: 'FORBIDDEN' });
    });

    test('keeps everything else writable: the owner edits and publishes, the admin suspends', async () => {
        const before = (await landlord.get(`/api/v1/managed-listings/${f.landlordDraft}`)).body;
        const edited = await landlord.put(`/api/v1/managed-listings/${f.landlordDraft}`, edit(Number(before.version)));
        expect(edited.status).toBe(200);
        expect(
            (await landlord.postIdempotent(`/api/v1/managed-listings/${f.landlordDraft}/publication`, {})).status,
        ).toBe(200);
        expect((await admin.post(`/api/v1/managed-listings/${f.landlordPublished}/suspension`)).status).toBe(200);
    });

    test('refuses to erase a showcase account (DEMO_RESTRICTED) and keeps it signed in', async () => {
        const showcase = await clients.open();
        expect((await showcase.login(f.tenant.email, PASSWORD)).status).toBe(200);
        expect((await showcase.get('/api/v1/auth/me')).body).toMatchObject({ isDemoRestricted: true });
        const refused = await showcase.post('/api/v1/personal-data/erasure', { password: PASSWORD });
        expect(refused.status).toBe(403);
        expect(refused.body).toMatchObject({ error: 'DEMO_RESTRICTED' });
        expect((await showcase.get('/api/v1/auth/me')).status).toBe(200);
        expect((await showcase.get('/api/v1/personal-data')).status).toBe(200);
    });
});
