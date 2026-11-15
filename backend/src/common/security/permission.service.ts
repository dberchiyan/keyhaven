import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

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

  /**
   * A showcase row of the public demo (`listings.is_demo`, set by the seed), which stays as
   * seeded: nobody writes to it while DEMO_MODE is on. Always false outside the demo.
   */
  async isDemoListing(listingId: string): Promise<boolean> {
    if (!this.config.isDemo) {
      return false;
    }
    const count = await this.prisma.listing.count({ where: { id: listingId, isDemo: true } });
    return count > 0;
  }

  async isPublishedListing(listingId: string): Promise<boolean> {
    const count = await this.prisma.listing.count({ where: { id: listingId, status: PUBLISHED } });
    return count > 0;
  }

  /** The photo belongs to the listing, and the listing to the caller (whole chain). */
  async isOwnListingPhoto(
    principal: Principal,
    listingId: string,
    photoId: string,
  ): Promise<boolean> {
    const ownership = ownedBy(principal);
    if (!ownership) {
      return false;
    }
    const count = await this.prisma.listingPhoto.count({
      where: { id: photoId, listingId, listing: ownership },
    });
    return count > 0;
  }

  async viewingExists(viewingId: string): Promise<boolean> {
    const count = await this.prisma.viewing.count({ where: { id: viewingId } });
    return count > 0;
  }

  /** The viewing is the tenant's own. */
  async isOwnViewing(userId: string, viewingId: string): Promise<boolean> {
    const count = await this.prisma.viewing.count({ where: { id: viewingId, tenantId: userId } });
    return count > 0;
  }

  /** The viewing is of a home the caller owns: the landlord's listing or the agency's (whole chain). */
  async isOwnListingViewing(principal: Principal, viewingId: string): Promise<boolean> {
    const ownership = ownedBy(principal);
    if (!ownership) {
      return false;
    }
    const count = await this.prisma.viewing.count({
      where: { id: viewingId, listing: ownership },
    });
    return count > 0;
  }

  /** A conversation with this id: a viewing's (its thread may not exist yet) or a support request's. */
  async conversationExists(conversationId: string): Promise<boolean> {
    const [viewings, conversations] = await Promise.all([
      this.prisma.viewing.count({ where: { id: conversationId } }),
      this.prisma.conversation.count({ where: { id: conversationId } }),
    ]);
    return viewings + conversations > 0;
  }

  /** The support request was opened by the caller. */
  async isOwnSupportConversation(userId: string, conversationId: string): Promise<boolean> {
    const count = await this.prisma.conversation.count({
      where: { id: conversationId, kind: 'SUPPORT', openedById: userId },
    });
    return count > 0;
  }

  async isOwnSavedSearch(userId: string, savedSearchId: string): Promise<boolean> {
    const count = await this.prisma.savedSearch.count({ where: { id: savedSearchId, userId } });
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
