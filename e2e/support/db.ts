import pg from 'pg';

import { databaseUrl } from './stack';

export const PASSWORD = 'Test-Password-2026!';

const PASSWORD_HASH =
    '$argon2id$v=19$m=65536,t=3,p=4$TIvCrPzIrKEQhv36lVMPvw$vBIn+N80EDsfXeo4oYpjjxSpL7ARnEQpft9gL+dYQHw';

export interface Person {
    id: string;
    email: string;
}

export interface Fixtures {
    run: string;
    tenant: Person;
    otherTenant: Person;
    landlord: Person;
    otherLandlord: Person;
    agent: Person;
    otherAgencyAgent: Person;
    admin: Person;
    agencyId: string;
    cityId: string;
    landlordPublished: string;
    landlordDraft: string;
    otherLandlordPublished: string;
    otherLandlordUnpublished: string;
    agencyPublished: string;
    agencyDraft: string;
    landlordDemo: string;
    agencyDemo: string;
}

type Owner = { landlordId: string } | { agencyId: string };

type ListingKey =
    | 'landlordPublished'
    | 'landlordDraft'
    | 'otherLandlordPublished'
    | 'otherLandlordUnpublished'
    | 'agencyPublished'
    | 'agencyDraft'
    | 'landlordDemo'
    | 'agencyDemo';

/** A fixture listing's title names its run and its role, so a page can be searched for exactly that home. */
export const listingTitle = (run: string, key: ListingKey): string => `Home ${run} ${key}`;

/**
 * Runs `work` with one connection to the run's database. The tests reach the app over HTTP; the database is touched
 * only to arrange what the API cannot create (agencies, agents, admins, cities, showcase rows) and to move a row in
 * time, and to read what an answer cannot show.
 */
export const withDb = async <T>(work: (db: pg.Client) => Promise<T>): Promise<T> => {
    const db = new pg.Client({ connectionString: databaseUrl(), options: '-c timezone=UTC' });
    await db.connect();
    try {
        return await work(db);
    } finally {
        await db.end();
    }
};

/** The single value of a one-row, one-column query. */
export const scalar = async <T>(db: pg.Client, text: string, values: unknown[] = []): Promise<T> => {
    const result = await db.query(text, values);
    const row: unknown = result.rows[0];
    if (!row || typeof row !== 'object') {
        throw new Error(`No row for: ${text}`);
    }
    return Object.values(row)[0] as T;
};

/** Every file starts with fresh rate-limit budgets: sign-ups and sign-ins add up across files. */
export const resetRateLimits = (): Promise<void> =>
    withDb(async (db) => {
        await db.query('DELETE FROM rate_limits');
    });

/** Fresh accounts and listings for one test file; names carry the run so files never collide. */
export const createFixtures = (run: string): Promise<Fixtures> =>
    withDb(async (db) => {
        await db.query('DELETE FROM rate_limits');
        const agency = async (name: string, slug: string): Promise<string> =>
            scalar<string>(
                db,
                `INSERT INTO agencies (name, email, phone, updated_at) VALUES ($1, $2, '+1 555 0100', now()) RETURNING id`,
                [name, `${slug}-${run}@test.example`],
            );
        const agencyId = await agency(`Agency ${run}`, 'agency');
        const otherAgencyId = await agency(`Other agency ${run}`, 'other');
        const cityId = await scalar<string>(
            db,
            `INSERT INTO cities (name, state, slug, time_zone) VALUES ('Testville', 'TX', 'testville', 'America/Chicago')
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        );
        const user = async (name: string, role: string, ownAgencyId: string | null = null): Promise<Person> => {
            const email = `${name}-${run}@test.example`.toLowerCase();
            const id = await scalar<string>(
                db,
                `INSERT INTO users (email, password_hash, first_name, last_name, role, agency_id, email_verified_at, updated_at)
                 VALUES ($1, $2, $3, 'Tester', $4, $5, now(), now()) RETURNING id`,
                [email, PASSWORD_HASH, name, role, ownAgencyId],
            );
            return { id, email };
        };
        const listing = async (key: ListingKey, owner: Owner, status: string, isDemo = false): Promise<string> => {
            const id = await scalar<string>(
                db,
                `INSERT INTO listings (landlord_id, agency_id, is_demo, title, description, property_type, kind, price,
                    currency, bedrooms, bathrooms, size_sqft, address_line1, city_id, zip, is_pet_friendly, is_furnished,
                    has_parking, available_on, status, published_at, updated_at)
                 VALUES ($1, $2, $3, $4, 'A test home.', 'APARTMENT', 'RENT', 1500, 'USD', 2, 1.0, 800, '1 Secret St', $5,
                    '75001', true, false, true, DATE '2026-12-01', $6::varchar, CASE WHEN $6::varchar = 'PUBLISHED' THEN now() END, now())
                 RETURNING id`,
                [
                    'landlordId' in owner ? owner.landlordId : null,
                    'agencyId' in owner ? owner.agencyId : null,
                    isDemo,
                    listingTitle(run, key),
                    cityId,
                    status,
                ],
            );
            await db.query(
                `INSERT INTO listing_photos (listing_id, url, position, updated_at) VALUES ($1, 'https://example.test/photo.jpg', 0, now())`,
                [id],
            );
            return id;
        };
        const tenant = await user('tenant', 'TENANT');
        const otherTenant = await user('other-tenant', 'TENANT');
        const landlord = await user('landlord', 'LANDLORD');
        const otherLandlord = await user('other-landlord', 'LANDLORD');
        const agent = await user('agent', 'AGENT', agencyId);
        const otherAgencyAgent = await user('other-agent', 'AGENT', otherAgencyId);
        const admin = await user('admin', 'ADMIN');
        return {
            run,
            tenant,
            otherTenant,
            landlord,
            otherLandlord,
            agent,
            otherAgencyAgent,
            admin,
            agencyId,
            cityId,
            landlordPublished: await listing('landlordPublished', { landlordId: landlord.id }, 'PUBLISHED'),
            landlordDraft: await listing('landlordDraft', { landlordId: landlord.id }, 'DRAFT'),
            otherLandlordPublished: await listing(
                'otherLandlordPublished',
                { landlordId: otherLandlord.id },
                'PUBLISHED',
            ),
            otherLandlordUnpublished: await listing(
                'otherLandlordUnpublished',
                { landlordId: otherLandlord.id },
                'UNPUBLISHED',
            ),
            agencyPublished: await listing('agencyPublished', { agencyId }, 'PUBLISHED'),
            agencyDraft: await listing('agencyDraft', { agencyId }, 'DRAFT'),
            landlordDemo: await listing('landlordDemo', { landlordId: landlord.id }, 'PUBLISHED', true),
            agencyDemo: await listing('agencyDemo', { agencyId }, 'PUBLISHED', true),
        };
    });
