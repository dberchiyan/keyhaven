import { PrismaPg } from '@prisma/adapter-pg';
import { PG_SESSION_OPTIONS } from '../src/common/persistence/pg-pool';
import { PrismaClient } from '../src/generated/prisma/client';
import { PasswordHasher } from '../src/modules/auth/service/password-hasher.service';
import { ListingStatus } from '../src/modules/listing/service/listing-status';
import { PropertyType } from '../src/modules/listing/service/property-type';
import { UserRole } from '../src/modules/user/service/user-role';
import { testDatabaseUrl } from './test-database';

/** Every fixture account signs in with it (meets the password rules). */
export const PASSWORD = 'Test-Password-2026!';

export interface Fixtures {
  tenant: { id: string; email: string };
  /** A second renter: two people racing for one viewing slot. */
  otherTenant: { id: string; email: string };
  landlord: { id: string; email: string };
  otherLandlord: { id: string; email: string };
  agent: { id: string; email: string };
  otherAgencyAgent: { id: string; email: string };
  admin: { id: string; email: string };
  agencyId: string;
  cityId: string;
  /** Owned by `landlord`, published. */
  landlordPublished: string;
  /** Owned by `landlord`, draft. */
  landlordDraft: string;
  /** Owned by `otherLandlord`, published. */
  otherLandlordPublished: string;
  /** Owned by `otherLandlord`, unpublished. */
  otherLandlordUnpublished: string;
  /** Owned by the agency, published. */
  agencyPublished: string;
  /** Owned by the agency, draft. */
  agencyDraft: string;
  /** Showcase rows of the public demo (`is_demo`): read-only while DEMO_MODE is on. */
  landlordDemo: string;
  agencyDemo: string;
}

/** Fresh accounts and listings for one test file; names carry the run so files never collide. */
export const createFixtures = async (run: string): Promise<Fixtures> => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl(), options: PG_SESSION_OPTIONS }),
  });
  try {
    // Every file starts with fresh rate-limit budgets (sign-ups and sign-ins add up across files).
    await prisma.rateLimit.deleteMany();
    const passwordHash = await new PasswordHasher().hash(PASSWORD);
    const agency = await prisma.agency.create({
      data: { name: `Agency ${run}`, email: `agency-${run}@test.example`, phone: '+1 555 0100' },
      select: { id: true },
    });
    const otherAgency = await prisma.agency.create({
      data: {
        name: `Other agency ${run}`,
        email: `other-${run}@test.example`,
        phone: '+1 555 0101',
      },
      select: { id: true },
    });
    const city = await prisma.city.upsert({
      where: { slug: 'testville' },
      create: { name: 'Testville', state: 'TX', slug: 'testville', timeZone: 'America/Chicago' },
      update: {},
      select: { id: true },
    });
    const user = async (
      name: string,
      role: UserRole,
      agencyId: string | null = null,
    ): Promise<{ id: string; email: string }> => {
      const email = `${name}-${run}@test.example`.toLowerCase();
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: name,
          lastName: 'Tester',
          role,
          agencyId,
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });
      return { id: created.id, email };
    };
    const tenant = await user('tenant', UserRole.TENANT);
    const otherTenant = await user('other-tenant', UserRole.TENANT);
    const landlord = await user('landlord', UserRole.LANDLORD);
    const otherLandlord = await user('other-landlord', UserRole.LANDLORD);
    const agent = await user('agent', UserRole.AGENT, agency.id);
    const otherAgencyAgent = await user('other-agent', UserRole.AGENT, otherAgency.id);
    const admin = await user('admin', UserRole.ADMIN);

    const listing = async (
      owner: { landlordId: string } | { agencyId: string },
      status: ListingStatus,
      isDemo = false,
    ): Promise<string> => {
      const created = await prisma.listing.create({
        data: {
          ...owner,
          isDemo,
          title: `Home ${run} ${status}`,
          description: 'A test home.',
          propertyType: PropertyType.APARTMENT,
          kind: 'RENT',
          price: '1500.0000',
          currency: 'USD',
          bedrooms: 2,
          bathrooms: '1.0',
          sizeSqft: 800,
          addressLine1: '1 Secret St',
          addressLine2: null,
          cityId: city.id,
          zip: '75001',
          petsAllowed: true,
          furnished: false,
          parking: true,
          availableFrom: new Date('2026-12-01T00:00:00Z'),
          status,
          publishedAt: status === ListingStatus.PUBLISHED ? new Date() : null,
          photos: { create: [{ url: 'https://example.test/photo.jpg', position: 0 }] },
        },
        select: { id: true },
      });
      return created.id;
    };
    return {
      tenant,
      otherTenant,
      landlord,
      otherLandlord,
      agent,
      otherAgencyAgent,
      admin,
      agencyId: agency.id,
      cityId: city.id,
      landlordPublished: await listing({ landlordId: landlord.id }, ListingStatus.PUBLISHED),
      landlordDraft: await listing({ landlordId: landlord.id }, ListingStatus.DRAFT),
      otherLandlordPublished: await listing(
        { landlordId: otherLandlord.id },
        ListingStatus.PUBLISHED,
      ),
      otherLandlordUnpublished: await listing(
        { landlordId: otherLandlord.id },
        ListingStatus.UNPUBLISHED,
      ),
      agencyPublished: await listing({ agencyId: agency.id }, ListingStatus.PUBLISHED),
      agencyDraft: await listing({ agencyId: agency.id }, ListingStatus.DRAFT),
      landlordDemo: await listing({ landlordId: landlord.id }, ListingStatus.PUBLISHED, true),
      agencyDemo: await listing({ agencyId: agency.id }, ListingStatus.PUBLISHED, true),
    };
  } finally {
    await prisma.$disconnect();
  }
};
