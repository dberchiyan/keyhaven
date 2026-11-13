import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import type { Principal } from './principal';

/** Mirrors `listings.status` PUBLISHED (the listing module owns the value set). */
const PUBLISHED = 'PUBLISHED';

/**
 * The only place ownership rules are written (security.md → Authorisation). Existence checks
 * only — returns booleans, never throws, never returns data. Every check starts at the caller:
 * their user id or their agency.
 */
@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /** The session is the user's own. */
  async isOwnSession(userId: string, sessionId: string): Promise<boolean> {
    const count = await this.prisma.session.count({ where: { id: sessionId, userId } });
    return count > 0;
  }

  async listingExists(listingId: string): Promise<boolean> {
    const count = await this.prisma.listing.count({ where: { id: listingId } });
    return count > 0;
  }

  /** The listing is the landlord's own, or belongs to the agent's agency. */
  async isOwnListing(principal: Principal, listingId: string): Promise<boolean> {
    const ownership = ownedBy(principal);
    if (!ownership) {
      return false;
    }
    const count = await this.prisma.listing.count({ where: { id: listingId, ...ownership } });
    return count > 0;
  }

  /** Published, or the caller's own, or the caller is an admin. */
  async isVisibleListing(principal: Principal, listingId: string): Promise<boolean> {
    if (principal.hasAuthority('ADMIN')) {
      return this.listingExists(listingId);
    }
    const ownership = ownedBy(principal);
    const count = await this.prisma.listing.count({
      where: {
        id: listingId,
        OR: [{ status: PUBLISHED }, ...(ownership ? [ownership] : [])],
      },
    });
    return count > 0;
  }
}

/** The `where` that says "owned by this caller": a landlord's listings or an agency's. */
const ownedBy = (principal: Principal): Prisma.ListingWhereInput | null => {
  if (principal.hasAuthority('LANDLORD')) {
    return { landlordId: principal.userId };
  }
  if (principal.hasAuthority('AGENT') && principal.agencyId) {
    return { agencyId: principal.agencyId };
  }
  return null;
};
