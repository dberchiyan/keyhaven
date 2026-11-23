import 'reflect-metadata';

import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';

import { PG_SESSION_OPTIONS } from '@/common/persistence/pg-pool';
import { PrismaClient } from '@/generated/prisma/client';
import { PasswordHasher } from '@/modules/auth/service/password-hasher.service';
import { UserRole } from '@/modules/user/service/user-role';

import { seedActivity } from './seed-activity';
import {
    AGENCY,
    CITIES,
    DEMO_ADMIN,
    DEMO_AGENT,
    DEMO_LANDLORD,
    DEMO_TENANT,
    OTHER_AGENTS,
    OTHER_LANDLORDS,
    OTHER_TENANTS,
    SEED_PASSWORD,
    type SeedPerson,
} from './seed-data';
import { seedListings, type SeedOwners } from './seed-listings';
import { seedMessages } from './seed-messages';
import { seedViewings } from './seed-viewings';

const seedEnv = z.object({
    APP_ENV: z.literal('dev'),
    DATABASE_URL: z.url(),
});

interface SeedPeople {
    tenantIds: string[];
    demoTenantId: string;
    demoLandlordId: string;
    demoAgentId: string;
    demoAdminId: string;
    owners: SeedOwners;
}

interface UserRow {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: UserRole;
    agencyId: string | null;
    passwordHash: string;
    emailVerifiedAt: Date;
}

/** Cities by slug and the agency by name: reference rows a re-run keeps as they are. */
const seedReference = async (prisma: PrismaClient): Promise<void> => {
    for (const city of CITIES) {
        await prisma.city.upsert({
            where: { slug: city.slug },
            create: { id: city.id, name: city.name, state: city.state, slug: city.slug, timeZone: city.timeZone },
            update: {},
            select: { id: true },
        });
    }
    await prisma.agency.upsert({
        where: { name: AGENCY.name },
        create: {
            id: AGENCY.id,
            name: AGENCY.name,
            email: AGENCY.email,
            phone: AGENCY.phone,
            website: AGENCY.website,
            description: AGENCY.description,
        },
        update: {},
        select: { id: true },
    });
};

/** Seeded accounts are verified: the demo has no mailbox to open the link from. */
const userRowsOf = (passwordHash: string, today: Date): UserRow[] => {
    const person = (people: SeedPerson, role: UserRole, agencyId: string | null = null): UserRow => ({
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email.toLowerCase(),
        phone: people.phone ?? null,
        role,
        agencyId,
        passwordHash,
        emailVerifiedAt: today,
    });
    return [
        person(DEMO_TENANT, UserRole.TENANT),
        person(DEMO_LANDLORD, UserRole.LANDLORD),
        person(DEMO_AGENT, UserRole.AGENT, AGENCY.id),
        person(DEMO_ADMIN, UserRole.ADMIN),
        ...OTHER_AGENTS.map((agent) => person(agent, UserRole.AGENT, AGENCY.id)),
        ...OTHER_LANDLORDS.map((landlord) => person(landlord, UserRole.LANDLORD)),
        ...OTHER_TENANTS.map((tenant) => person(tenant, UserRole.TENANT)),
    ];
};

/** People are matched by email, so the ids of a re-run are the first run's. */
const peopleOf = async (prisma: PrismaClient): Promise<SeedPeople> => {
    const idByEmail = new Map(
        (await prisma.user.findMany({ select: { id: true, email: true } })).map((user) => [user.email, user.id]),
    );
    const idOf = (email: string): string => {
        const id = idByEmail.get(email.toLowerCase());
        if (!id) {
            throw new Error(`Seed user not found: ${email}`);
        }
        return id;
    };
    return {
        tenantIds: OTHER_TENANTS.map((tenant) => idOf(tenant.email)),
        demoTenantId: idOf(DEMO_TENANT.email),
        demoLandlordId: idOf(DEMO_LANDLORD.email),
        demoAgentId: idOf(DEMO_AGENT.email),
        demoAdminId: idOf(DEMO_ADMIN.email),
        owners: {
            agencyId: AGENCY.id,
            demoLandlordId: idOf(DEMO_LANDLORD.email),
            landlordIds: OTHER_LANDLORDS.map((landlord) => idOf(landlord.email)),
            agentIds: [DEMO_AGENT, ...OTHER_AGENTS].map((agent) => idOf(agent.email)),
        },
    };
};

/** The catalogue, then the activity on it, then viewings and the conversations about them — in that order. */
const seedContent = async (prisma: PrismaClient, people: SeedPeople, now: Date, today: Date): Promise<string> => {
    const listings = await seedListings(prisma, people.owners, today);
    const activity = await seedActivity(prisma, [people.demoTenantId, ...people.tenantIds], today);
    const viewings = await seedViewings(prisma, people.demoTenantId, people.demoLandlordId, people.tenantIds, now);
    const messages = await seedMessages(prisma, people, now);
    return `${listings.listings} listings, ${listings.photos} photos, ${activity.views} views, ${activity.saves} saves, ${viewings.schedules} viewing schedules, ${viewings.viewings} viewings, ${messages.threads} conversations with ${messages.messages} messages (${listings.retired} photos replaced, ${listings.descriptions} descriptions refreshed; existing rows kept)`;
};

/**
 * MIG-7: development seed (APP_ENV=dev only) of fictional people — the six cities, one agency, the showcase accounts
 * (one per role), more landlords, agents and renters, ~1,300 listings with photos, and the renters' visits and saves
 * over the last months (the owners' insights). The shared password is a public constant. Idempotent — existing rows
 * are kept (people are matched by email, cities by slug, listings by their fixed ids, activity by its unique keys).
 */
const seed = async (): Promise<void> => {
    try {
        process.loadEnvFile('.env');
    } catch {}
    const env = seedEnv.parse(process.env);
    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.DATABASE_URL, options: PG_SESSION_OPTIONS }),
    });
    try {
        const passwordHash = await new PasswordHasher().hash(SEED_PASSWORD);
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        await seedReference(prisma);
        const users = await prisma.user.createMany({ data: userRowsOf(passwordHash, today), skipDuplicates: true });
        const content = await seedContent(prisma, await peopleOf(prisma), now, today);
        process.stdout.write(`Seeded ${CITIES.length} cities, 1 agency, ${users.count} users, ${content}\n`);
    } finally {
        await prisma.$disconnect();
    }
};

void seed();
