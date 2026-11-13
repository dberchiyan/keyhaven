import 'reflect-metadata';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PG_SESSION_OPTIONS } from '../src/common/persistence/pg-pool';
import { PrismaClient } from '../src/generated/prisma/client';
import { PasswordHasher } from '../src/modules/auth/service/password-hasher.service';
import { UserRole } from '../src/modules/user/service/user-role';
import {
  AGENCY,
  CITIES,
  DEMO_ADMIN,
  DEMO_AGENT,
  DEMO_LANDLORD,
  DEMO_TENANT,
  OTHER_AGENTS,
  OTHER_LANDLORDS,
  SEED_PASSWORD,
  type SeedPerson,
} from './seed-data';
import { seedListings } from './seed-listings';

/**
 * Development seed (APP_ENV=dev only): the six cities, one agency, the showcase accounts (one
 * per role), more landlords and agents, and ~1,000 listings with photos. Idempotent — existing
 * rows are kept (people are matched by email, cities by slug, listings by their fixed ids).
 */
const seedEnv = z.object({
  APP_ENV: z.literal('dev'),
  DATABASE_URL: z.url(),
});

const seed = async (): Promise<void> => {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Variables come from the environment.
  }
  const env = seedEnv.parse(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL, options: PG_SESSION_OPTIONS }),
  });
  try {
    const passwordHash = await new PasswordHasher().hash(SEED_PASSWORD);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    for (const city of CITIES) {
      await prisma.city.upsert({
        where: { slug: city.slug },
        create: {
          id: city.id,
          name: city.name,
          state: city.state,
          slug: city.slug,
          timeZone: city.timeZone,
        },
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

    const person = (
      people: SeedPerson,
      role: UserRole,
      agencyId: string | null = null,
    ): {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      role: UserRole;
      agencyId: string | null;
      passwordHash: string;
      emailVerifiedAt: Date;
    } => ({
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email.toLowerCase(),
      phone: people.phone ?? null,
      role,
      agencyId,
      passwordHash,
      // Seeded accounts are verified: the demo has no mailbox to open the link from.
      emailVerifiedAt: today,
    });
    const users = await prisma.user.createMany({
      data: [
        person(DEMO_TENANT, UserRole.TENANT),
        person(DEMO_LANDLORD, UserRole.LANDLORD),
        person(DEMO_AGENT, UserRole.AGENT, AGENCY.id),
        person(DEMO_ADMIN, UserRole.ADMIN),
        ...OTHER_AGENTS.map((agent) => person(agent, UserRole.AGENT, AGENCY.id)),
        ...OTHER_LANDLORDS.map((landlord) => person(landlord, UserRole.LANDLORD)),
      ],
      skipDuplicates: true,
    });

    const idByEmail = new Map(
      (await prisma.user.findMany({ select: { id: true, email: true } })).map((user) => [
        user.email,
        user.id,
      ]),
    );
    const idOf = (email: string): string => {
      const id = idByEmail.get(email.toLowerCase());
      if (!id) {
        throw new Error(`Seed user not found: ${email}`);
      }
      return id;
    };
    const listings = await seedListings(
      prisma,
      {
        agencyId: AGENCY.id,
        demoLandlordId: idOf(DEMO_LANDLORD.email),
        landlordIds: OTHER_LANDLORDS.map((landlord) => idOf(landlord.email)),
        agentIds: [DEMO_AGENT, ...OTHER_AGENTS].map((agent) => idOf(agent.email)),
      },
      today,
    );
    process.stdout.write(
      `Seeded ${CITIES.length} cities, 1 agency, ${users.count} users, ${listings.listings} listings, ${listings.photos} photos (${listings.retired} photos replaced, ${listings.descriptions} descriptions refreshed; existing rows kept)\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
};

void seed();
