import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Pageable } from '../../../common/dto/pageable';
import {
  BusinessRuleException,
  ConcurrentModificationException,
  ResourceNotFoundException,
} from '../../../common/exception/api.exception';
import { toMoney } from '../../../common/persistence/money';
import type { Principal } from '../../../common/security/principal';
import { AuditAction, AuditTargetType } from '../../audit/service/audit-action';
import { AuditField, auditValue, changeOf } from '../../audit/service/audit-change';
import { AuditService } from '../../audit/service/audit.service';
import { UserRole } from '../../user/service/user-role';
import { ListingRepository } from '../repository/listing.repository';
import type {
  CityRecord,
  ListingCardRecord,
  ListingDetailRecord,
  ManagedListingCardRecord,
} from '../repository/record/listing.record';
import type { ListingCriteria, ManagedListingCriteria } from './filter/listing.criteria';
import type { ListingSortField, ManagedListingSortField } from './listing-sort';
import {
  isListingStatus,
  LISTING_STATUSES,
  LISTING_TRANSITIONS,
  type ListingStatus,
  type ListingTransition,
} from './listing-status';
import type {
  ListedBy,
  ListingCard,
  ListingCity,
  ListingDetail,
  ListingScope,
  ManagedListing,
  ManagedListingCard,
} from './listing.types';
import { isPropertyType, type PropertyType } from './property-type';

/** `?search=` is split into at most this many terms (api.md → Pagination). */
const MAX_SEARCH_TERMS = 5;

export const toSearchTerms = (search: string | undefined): string[] =>
  (search ?? '')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .slice(0, MAX_SEARCH_TERMS);

const TRANSITION_ACTION: Readonly<Record<ListingTransition, AuditAction>> = {
  publish: AuditAction.LISTING_PUBLISHED,
  unpublish: AuditAction.LISTING_UNPUBLISHED,
  suspend: AuditAction.LISTING_SUSPENDED,
};

@Injectable()
export class ListingService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly auditService: AuditService,
    @InjectPinoLogger(ListingService.name) private readonly logger: PinoLogger,
  ) {}

  async cities(): Promise<ListingCity[]> {
    return (await this.listingRepository.findCities()).map(toCity);
  }

  /** Search (every signed-in user): published listings only. */
  async search(
    criteria: ListingCriteria,
    pageable: Pageable<ListingSortField>,
  ): Promise<{ content: ListingCard[]; totalElements: number }> {
    const page = await this.listingRepository.findPublishedPage(criteria, pageable);
    return { content: page.content.map(toCard), totalElements: page.totalElements };
  }

  /**
   * One listing for a viewer (the policy admitted them: published, or theirs, or an admin). The
   * exact address is shown only to the owner, the agency's agents and admins — M2 adds a tenant
   * whose viewing was confirmed.
   */
  async findForViewer(principal: Principal, listingId: string): Promise<ListingDetail> {
    const listing = await this.findDetail(listingId);
    const address = this.ownsOrAdministers(principal, listing)
      ? { line1: listing.addressLine1, line2: listing.addressLine2 }
      : null;
    return toDetail(listing, address);
  }

  /** The dashboard page: the caller's scope (landlord / agency / everything for admins). */
  async findManagedPage(
    principal: Principal,
    criteria: ManagedListingCriteria,
    pageable: Pageable<ManagedListingSortField>,
  ): Promise<{ content: ManagedListingCard[]; totalElements: number }> {
    const page = await this.listingRepository.findManagedPage(
      scopeOf(principal),
      criteria,
      pageable,
    );
    return { content: page.content.map(toManagedCard), totalElements: page.totalElements };
  }

  /** Listings of the caller's scope per status; statuses with none are 0. */
  async countByStatus(principal: Principal): Promise<Record<ListingStatus, number>> {
    const counts = await this.listingRepository.countByStatus(scopeOf(principal));
    const result = Object.fromEntries(LISTING_STATUSES.map((status) => [status, 0])) as Record<
      ListingStatus,
      number
    >;
    for (const { status, count } of counts) {
      if (isListingStatus(status)) {
        result[status] = count;
      }
    }
    return result;
  }

  /** One listing in the dashboard (the policy checked ownership): the address included. */
  async findManaged(listingId: string): Promise<ManagedListing> {
    return toManaged(await this.findDetail(listingId));
  }

  /**
   * A status change by its owner (publish, unpublish) or an admin (suspend). Repeating the
   * same decision is a no-op that answers the current state (api.md → Contract); anything the
   * table does not allow — publishing a suspended listing — is 422.
   */
  @Transactional()
  async transition(
    principal: Principal,
    listingId: string,
    transition: ListingTransition,
  ): Promise<ManagedListing> {
    const current = await this.listingRepository.findStatusById(listingId);
    if (!current || !isListingStatus(current.status)) {
      throw new ResourceNotFoundException();
    }
    const rule = LISTING_TRANSITIONS[transition];
    if (current.status === rule.to) {
      return this.findManaged(listingId);
    }
    if (!(rule.from as readonly ListingStatus[]).includes(current.status)) {
      throw new BusinessRuleException(`errors.listing.${transition}NotAllowed`, {
        status: current.status,
      });
    }
    const published = await this.listingRepository.updateStatus(
      listingId,
      current.version,
      rule.to,
      transition === 'publish' ? new Date() : undefined,
      principal.userId,
    );
    if (!published) {
      throw new ConcurrentModificationException();
    }
    await this.auditService.record({
      action: TRANSITION_ACTION[transition],
      target: { type: AuditTargetType.LISTING, id: listingId, label: current.title },
      changes: changeOf(
        AuditField.STATUS,
        auditValue.status(current.status),
        auditValue.status(rule.to),
      ),
    });
    this.logger.info({ listingId, transition, by: principal.userId }, 'Listing status changed');
    return this.findManaged(listingId);
  }

  private async findDetail(listingId: string): Promise<ListingDetailRecord> {
    const listing = await this.listingRepository.findDetailById(listingId);
    if (!listing) {
      throw new ResourceNotFoundException();
    }
    return listing;
  }

  private ownsOrAdministers(principal: Principal, listing: ListingDetailRecord): boolean {
    if (principal.hasAuthority(UserRole.ADMIN)) {
      return true;
    }
    const scope = scopeOf(principal);
    return (
      (scope.kind === 'LANDLORD' && listing.landlordId === scope.landlordId) ||
      (scope.kind === 'AGENCY' && listing.agencyId === scope.agencyId)
    );
  }
}

/** Whose listings the caller manages — the one place the role becomes a query scope. */
const scopeOf = (principal: Principal): ListingScope => {
  if (principal.hasAuthority(UserRole.ADMIN)) {
    return { kind: 'ALL' };
  }
  if (principal.hasAuthority(UserRole.AGENT) && principal.agencyId) {
    return { kind: 'AGENCY', agencyId: principal.agencyId };
  }
  // Tenants never reach the dashboard (the policy refuses them); the scope would be empty anyway.
  return { kind: 'LANDLORD', landlordId: principal.userId };
};

const toCity = (city: CityRecord): ListingCity => ({
  id: city.id,
  name: city.name,
  state: city.state,
  slug: city.slug,
  timeZone: city.timeZone,
});

const toPropertyType = (value: string): PropertyType => {
  if (!isPropertyType(value)) {
    // Guarded by ck_listings_property_type.
    throw new Error('Unknown property type in database');
  }
  return value;
};

const toCard = (listing: ListingCardRecord): ListingCard => ({
  id: listing.id,
  title: listing.title,
  propertyType: toPropertyType(listing.propertyType),
  rent: toMoney(listing.rent, listing.currency),
  bedrooms: listing.bedrooms,
  bathrooms: listing.bathrooms.toFixed(1),
  sizeSqft: listing.sizeSqft,
  city: toCity(listing.city),
  neighborhood: listing.neighborhood,
  availableFrom: listing.availableFrom,
  publishedAt: listing.publishedAt,
  coverPhotoUrl: listing.photos[0]?.url ?? null,
});

const toStatus = (value: string): ListingStatus => {
  if (!isListingStatus(value)) {
    // Guarded by ck_listings_status.
    throw new Error('Unknown listing status in database');
  }
  return value;
};

const toManagedCard = (listing: ManagedListingCardRecord): ManagedListingCard => ({
  ...toCard(listing),
  status: toStatus(listing.status),
});

const toListedBy = (listing: ListingDetailRecord): ListedBy => {
  if (listing.agency) {
    return {
      kind: 'AGENCY',
      name: listing.agency.name,
      phone: listing.agency.phone,
      email: listing.agency.email,
      website: listing.agency.website,
    };
  }
  if (listing.landlord) {
    return {
      kind: 'LANDLORD',
      name: `${listing.landlord.firstName} ${listing.landlord.lastName}`,
      phone: listing.landlord.phone,
      email: listing.landlord.email,
    };
  }
  // Guarded by ck_listings_owner (exactly one owner).
  throw new Error('Listing without an owner in database');
};

const toDetail = (
  listing: ListingDetailRecord,
  address: ListingDetail['address'],
): ListingDetail => ({
  ...toCard(listing),
  description: listing.description,
  furnished: listing.furnished,
  petsAllowed: listing.petsAllowed,
  parking: listing.parking,
  zip: listing.zip,
  photos: listing.photos.map((photo) => ({ id: photo.id, url: photo.url })),
  listedBy: toListedBy(listing),
  address,
});

const toManaged = (listing: ListingDetailRecord): ManagedListing => {
  return {
    ...toDetail(listing, { line1: listing.addressLine1, line2: listing.addressLine2 }),
    status: toStatus(listing.status),
    address: { line1: listing.addressLine1, line2: listing.addressLine2 },
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    version: listing.version,
  };
};
