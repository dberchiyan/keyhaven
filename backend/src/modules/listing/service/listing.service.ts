import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Pageable } from '../../../common/dto/pageable';
import {
  BusinessRuleException,
  ConcurrentModificationException,
  ResourceNotFoundException,
} from '../../../common/exception/api.exception';
import { toDecimal, toMoney } from '../../../common/persistence/money';
import type { Principal } from '../../../common/security/principal';
import { AuditAction, AuditTargetType } from '../../audit/service/audit-action';
import { AuditField, auditValue, changeOf } from '../../audit/service/audit-change';
import { AppConfigService } from '../../../common/config/app-config.service';
import { AuditService } from '../../audit/service/audit.service';
import { ObjectStorage } from '../../storage/service/object-storage';
import { UserRole } from '../../user/service/user-role';
import { ListingPhotoRepository } from '../repository/listing-photo.repository';
import { ListingRepository } from '../repository/listing.repository';
import type {
  CityRecord,
  ListingCardRecord,
  ListingDetailRecord,
  ManagedListingCardRecord,
  ViewerDetailRecord,
  ManagedListingRecord,
  ManagedPhotoRecord,
  ViewerCardRecord,
} from '../repository/record/listing.record';
import type { ListingCriteria, ManagedListingCriteria } from './filter/listing.criteria';
import type { ListingSortField, ManagedListingSortField } from './listing-sort';
import {
  EDITABLE_STATUSES,
  isListingStatus,
  LISTING_STATUSES,
  LISTING_TRANSITIONS,
  type ListingStatus,
  type ListingTransition,
} from './listing-status';
import type {
  InsightTarget,
  ListedBy,
  ListingCard,
  ListingCity,
  ListingDetail,
  ListingDraft,
  ListingInsights,
  ListingScope,
  ListingViewer,
  ManagedInsights,
  ManagedListing,
  PriceContext,
  ManagedListingCard,
  ManagedPhoto,
  NewPhotoIntent,
  PhotoUploadIntent,
  UpdateListingCommand,
} from './listing.types';
import { isListingKind, type ListingKind } from './listing-kind';
import { INSIGHT_TOP_LIMIT, type InsightPeriod } from './insight-period';
import { PRICE_CONTEXT_MIN_SAMPLE } from './listing.types';
import {
  isPhotoStatus,
  MAX_PENDING_PHOTOS,
  MAX_PHOTOS,
  PHOTO_MAX_BYTES,
  PhotoStatus,
} from './photo-status';
import { sniffImageType } from './photo-type';
import { isPropertyType, type PropertyType } from './property-type';

/** `?search=` is split into at most this many terms (api.md → Pagination). */
const MAX_SEARCH_TERMS = 5;
/** Intents never confirmed within a day are dropped (platform.md → unconfirmed intents). */
const INTENT_TTL_MS = 24 * 60 * 60 * 1000;

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
    private readonly photoRepository: ListingPhotoRepository,
    private readonly auditService: AuditService,
    private readonly storage: ObjectStorage,
    private readonly config: AppConfigService,
    @InjectPinoLogger(ListingService.name) private readonly logger: PinoLogger,
  ) {}

  async cities(): Promise<ListingCity[]> {
    return (await this.listingRepository.findCities()).map(toCity);
  }

  /** Search (everyone, signed in or not): published listings only; `saved` is the viewer's. */
  async search(
    criteria: ListingCriteria,
    pageable: Pageable<ListingSortField>,
    viewerUserId: string | null,
  ): Promise<{ content: ListingCard[]; totalElements: number }> {
    const page = await this.listingRepository.findPublishedPage(criteria, pageable, viewerUserId);
    return {
      content: page.content.map((listing) => this.toViewerCard(listing)),
      totalElements: page.totalElements,
    };
  }

  /**
   * One listing for a viewer (the policy admitted them: published, or theirs, or an admin). The
   * exact address is shown only to the owner, the agency's agents and admins — M2 adds a tenant
   * whose viewing was confirmed. Anyone else's visit counts as a view (once per viewer and day;
   * a visitor without an account is known by a daily hash).
   */
  async findForViewer(
    principal: Principal | null,
    listingId: string,
    visitorKey: string,
  ): Promise<ListingDetail> {
    const listing = await this.findDetail(listingId, principal?.userId ?? null);
    const owns = principal ? this.ownsOrAdministers(principal, listing) : false;
    if (!owns) {
      const viewer: ListingViewer = principal
        ? { kind: 'USER', userId: principal.userId }
        : { kind: 'VISITOR', visitorKey };
      await this.listingRepository.recordView(listingId, viewer, utcToday());
    }
    return {
      ...this.toDetail(
        listing,
        owns ? { line1: listing.addressLine1, line2: listing.addressLine2 } : null,
        listing.savedBy.length > 0,
      ),
      priceContext: await this.priceContextOf(listing),
    };
  }

  /** Homes like this one (the policy admitted the id); "saved" is the viewer's. */
  async findSimilar(listingId: string, viewerUserId: string | null): Promise<ListingCard[]> {
    const listing = await this.findDetail(listingId, null);
    const ids = await this.listingRepository.findSimilarIds({
      ...listing,
      cityId: listing.city.id,
    });
    const cards = await this.listingRepository.findCardsByIds(ids, viewerUserId);
    return cards.map((card) => this.toViewerCard(card));
  }

  /** The homes the caller opened lately, still on the site, latest first. */
  async findRecentlyViewed(userId: string): Promise<ListingCard[]> {
    const ids = await this.listingRepository.findRecentlyViewedIds(userId);
    const cards = await this.listingRepository.findCardsByIds(ids, userId);
    return cards.map((card) => this.toViewerCard(card));
  }

  /** Cards for ids a visitor kept (their own "recently viewed"), in the order given. */
  async findCards(ids: readonly string[], viewerUserId: string | null): Promise<ListingCard[]> {
    const cards = await this.listingRepository.findCardsByIds(ids, viewerUserId);
    return cards.map((card) => this.toViewerCard(card));
  }

  /** The home's price against comparable ones (ListingDetail.priceContext); null without enough of them. */
  private async priceContextOf(listing: ListingDetailRecord): Promise<PriceContext | null> {
    const medians = await this.listingRepository.findPriceMedians({
      id: listing.id,
      kind: listing.kind,
      cityId: listing.city.id,
      propertyType: listing.propertyType,
      neighborhood: listing.neighborhood,
    });
    const chosen =
      medians.neighborhoodMedian !== null && medians.neighborhoodSample >= PRICE_CONTEXT_MIN_SAMPLE
        ? {
            scope: 'NEIGHBORHOOD' as const,
            median: medians.neighborhoodMedian,
            sample: medians.neighborhoodSample,
          }
        : medians.cityMedian !== null && medians.citySample >= PRICE_CONTEXT_MIN_SAMPLE
          ? { scope: 'CITY' as const, median: medians.cityMedian, sample: medians.citySample }
          : null;
    if (!chosen) {
      return null;
    }
    // The median arrives as a double from SQL; from here on it is a Decimal (data.md → Money).
    const median = toDecimal(chosen.median.toFixed(4));
    const differencePercent = listing.price
      .minus(median)
      .div(median)
      .times(100)
      .toDecimalPlaces(0)
      .toNumber();
    return {
      scope: chosen.scope,
      median: toMoney(median, listing.currency),
      sample: chosen.sample,
      differencePercent,
    };
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
    return {
      content: page.content.map((listing) => this.toManagedCard(listing)),
      totalElements: page.totalElements,
    };
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
    const [listing, photos] = await Promise.all([
      this.listingRepository.findManagedById(listingId),
      this.photoRepository.findByListing(listingId),
    ]);
    if (!listing) {
      throw new ResourceNotFoundException();
    }
    return { ...this.toManaged(listing, photos), priceContext: await this.priceContextOf(listing) };
  }

  /**
   * The dashboard's insights: views and saves per day over the caller's scope, the totals
   * against the period before, and the listings that drew the most interest in the window.
   */
  async findInsights(principal: Principal, period: InsightPeriod): Promise<ManagedInsights> {
    const scope = scopeOf(principal);
    const insights = await this.insightsOf(scope, period);
    const top = await this.listingRepository.findTopListings(
      scope,
      insights.from,
      insights.to,
      INSIGHT_TOP_LIMIT,
    );
    const cards = await this.listingRepository.findManagedCardsByIds(top.map((row) => row.id));
    const byId = new Map(cards.map((card) => [card.id, card]));
    return {
      ...insights,
      top: top.flatMap((row) => {
        const card = byId.get(row.id);
        return card
          ? [{ listing: this.toManagedCard(card), views: row.views, saves: row.saves }]
          : [];
      }),
    };
  }

  /** One listing's insights (the policy checked ownership). */
  findListingInsights(listingId: string, period: InsightPeriod): Promise<ListingInsights> {
    return this.insightsOf({ kind: 'LISTING', listingId }, period);
  }

  /** The window ends today (UTC) and spans `period` days; the previous window ends the day before it starts. */
  private async insightsOf(target: InsightTarget, period: InsightPeriod): Promise<ListingInsights> {
    const today = utcToday();
    const to = toDayString(today);
    const from = toDayString(addDays(today, -(period - 1)));
    const previousTo = toDayString(addDays(today, -period));
    const previousFrom = toDayString(addDays(today, -(2 * period - 1)));
    const [series, previous] = await Promise.all([
      this.listingRepository.findInsightSeries(target, from, to),
      this.listingRepository.countInsightTotals(target, previousFrom, previousTo),
    ]);
    const totals = series.reduce(
      (sum, point) => ({ views: sum.views + point.views, saves: sum.saves + point.saves }),
      { views: 0, saves: 0 },
    );
    return { from, to, period, series, totals, previous };
  }

  /** A new DRAFT: a landlord's own, or the agent's agency's (never from the request). */
  async create(principal: Principal, draft: ListingDraft): Promise<ManagedListing> {
    await this.assertCity(draft.cityId);
    const id = await this.createDraft(principal, draft);
    this.logger.info({ listingId: id, by: principal.userId }, 'Listing created');
    return this.findManaged(id);
  }

  @Transactional()
  private async createDraft(principal: Principal, draft: ListingDraft): Promise<string> {
    const scope = scopeOf(principal);
    const owner =
      scope.kind === 'AGENCY'
        ? { landlordId: null, agencyId: scope.agencyId }
        : { landlordId: principal.userId, agencyId: null };
    const id = await this.listingRepository.create(owner, draft, principal.userId);
    await this.auditService.record({
      action: AuditAction.LISTING_CREATED,
      target: { type: AuditTargetType.LISTING, id, label: draft.title },
      changes: changeOf(AuditField.STATUS, null, auditValue.status('DRAFT')),
    });
    return id;
  }

  /** The owner's edit (optimistic lock); a suspended listing is no longer theirs to shape. */
  async update(
    principal: Principal,
    listingId: string,
    command: UpdateListingCommand,
  ): Promise<ManagedListing> {
    await this.assertCity(command.cityId);
    await this.applyUpdate(principal, listingId, command);
    return this.findManaged(listingId);
  }

  @Transactional()
  private async applyUpdate(
    principal: Principal,
    listingId: string,
    command: UpdateListingCommand,
  ): Promise<void> {
    const current = await this.listingRepository.findStatusById(listingId);
    if (!current || !isListingStatus(current.status)) {
      throw new ResourceNotFoundException();
    }
    if (!(EDITABLE_STATUSES as readonly ListingStatus[]).includes(current.status)) {
      throw new BusinessRuleException('errors.listing.notEditable', { status: current.status });
    }
    if (current.version !== command.version) {
      throw new ConcurrentModificationException();
    }
    const { version, ...draft } = command;
    if (!(await this.listingRepository.update(listingId, version, draft, principal.userId))) {
      throw new ConcurrentModificationException();
    }
    await this.auditService.record({
      action: AuditAction.LISTING_UPDATED,
      target: { type: AuditTargetType.LISTING, id: listingId, label: draft.title },
      changes: [],
    });
  }

  /**
   * A status change by its owner (publish, unpublish) or an admin (suspend). Repeating the
   * same decision is a no-op that answers the current state (api.md → Contract); anything the
   * table does not allow — publishing a suspended listing — is 422. Publishing needs a photo.
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
    if (transition === 'publish' && (await this.photoRepository.countReady(listingId)) === 0) {
      throw new BusinessRuleException('errors.listing.publishNeedsPhoto');
    }
    const changed = await this.listingRepository.updateStatus(
      listingId,
      current.version,
      rule.to,
      transition === 'publish' ? new Date() : undefined,
      principal.userId,
    );
    if (!changed) {
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

  /**
   * An upload intent (platform.md → File uploads): the row waits as PENDING, the client PUTs the
   * bytes straight to storage with the pre-signed URL (type and size signed in), then confirms.
   */
  async createPhotoIntent(
    principal: Principal,
    listingId: string,
    intent: NewPhotoIntent,
  ): Promise<PhotoUploadIntent> {
    if (intent.sizeBytes > PHOTO_MAX_BYTES) {
      throw new BusinessRuleException('errors.listing.photoTooLarge', {
        maxMb: PHOTO_MAX_BYTES / (1024 * 1024),
      });
    }
    // Server-generated key: the original filename is display metadata only. Signing is local
    // and comes first, so a signing failure leaves no orphan row.
    const key = `listings/${listingId}/${randomUUID()}.${EXTENSION[intent.contentType]}`;
    const upload = await this.storage.presignUpload(key, intent.contentType, intent.sizeBytes);
    const photoId = await this.reserveIntent(listingId, key, intent, principal.userId);
    return { photoId, uploadUrl: upload.url, headers: upload.headers, expiresAt: upload.expiresAt };
  }

  /**
   * The PENDING row, within the listing's bounds: at most MAX_PHOTOS ready photos and
   * MAX_PENDING_PHOTOS open intents — without the second bound an owner could open rows and
   * presigned slots without limit. The listing is locked so the counts are not racing.
   */
  @Transactional()
  private async reserveIntent(
    listingId: string,
    key: string,
    intent: NewPhotoIntent,
    createdBy: string,
  ): Promise<string> {
    await this.listingRepository.lock(listingId);
    if ((await this.photoRepository.countReady(listingId)) >= MAX_PHOTOS) {
      throw new BusinessRuleException('errors.listing.tooManyPhotos', { max: MAX_PHOTOS });
    }
    if ((await this.photoRepository.countPending(listingId)) >= MAX_PENDING_PHOTOS) {
      throw new BusinessRuleException('errors.listing.tooManyPendingUploads', {
        max: MAX_PENDING_PHOTOS,
      });
    }
    return this.photoRepository.createIntent(
      listingId,
      key,
      intent.contentType,
      intent.sizeBytes,
      createdBy,
    );
  }

  /**
   * The client finished the PUT: the object is checked (its size from HEAD, its type from the
   * first bytes — never the client's word) and the photo becomes the last READY one. A repeat on
   * a ready photo changes nothing; a mismatch removes the object and the intent (422).
   */
  async confirmPhoto(listingId: string, photoId: string): Promise<ManagedListing> {
    const photo = await this.photoRepository.findUpload(listingId, photoId);
    if (!photo || !photo.storageKey) {
      throw new ResourceNotFoundException();
    }
    if (photo.status === PhotoStatus.READY) {
      return this.findManaged(listingId);
    }
    const stored = await this.storage.head(photo.storageKey);
    if (!stored) {
      throw new BusinessRuleException('errors.listing.photoNotUploaded');
    }
    const detected = sniffImageType(await this.storage.readHead(photo.storageKey, 32));
    if (
      detected !== photo.contentType ||
      stored.sizeBytes !== photo.sizeBytes ||
      stored.sizeBytes > PHOTO_MAX_BYTES
    ) {
      // Outside any transaction: the object goes first, the row after (platform.md).
      await this.storage.delete(photo.storageKey);
      await this.photoRepository.deletePendingByIds([photo.id]);
      throw new BusinessRuleException('errors.listing.photoRejected');
    }
    await this.readyPhoto(listingId, photo.id, stored.sizeBytes);
    return this.findManaged(listingId);
  }

  /** Count and position under the listing's row lock: two confirmations at once stay in order. */
  @Transactional()
  private async readyPhoto(listingId: string, photoId: string, sizeBytes: number): Promise<void> {
    await this.listingRepository.lock(listingId);
    if ((await this.photoRepository.countReady(listingId)) >= MAX_PHOTOS) {
      throw new BusinessRuleException('errors.listing.tooManyPhotos', { max: MAX_PHOTOS });
    }
    const position = await this.photoRepository.nextPosition(listingId);
    await this.photoRepository.markReady(photoId, position, sizeBytes);
  }

  /** The new order: exactly the listing's ready photos, each once (422 otherwise). */
  async reorderPhotos(listingId: string, orderedIds: readonly string[]): Promise<ManagedListing> {
    await this.applyOrder(listingId, orderedIds);
    return this.findManaged(listingId);
  }

  @Transactional()
  private async applyOrder(listingId: string, orderedIds: readonly string[]): Promise<void> {
    const ready = (await this.photoRepository.findByListing(listingId))
      .filter((photo) => photo.status === PhotoStatus.READY)
      .map((photo) => photo.id);
    const sameSet =
      ready.length === orderedIds.length &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => ready.includes(id));
    if (!sameSet) {
      throw new BusinessRuleException('errors.listing.photoOrderMismatch');
    }
    await this.photoRepository.reorder(listingId, orderedIds);
  }

  /** Removes a photo: the row first (so the gallery is consistent), the object after commit. */
  async removePhoto(listingId: string, photoId: string): Promise<void> {
    const photo = await this.photoRepository.findUpload(listingId, photoId);
    if (!photo) {
      throw new ResourceNotFoundException();
    }
    await this.deletePhotoRow(listingId, photoId);
    if (photo.storageKey) {
      await this.deleteObjectQuietly(photo.storageKey);
    }
  }

  @Transactional()
  private async deletePhotoRow(listingId: string, photoId: string): Promise<void> {
    await this.photoRepository.remove(listingId, photoId);
  }

  /** Upload intents never confirmed within a day: rows and objects go (bounded per run). */
  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredIntents(): Promise<void> {
    const expired = await this.photoRepository.findExpiredIntents(
      new Date(Date.now() - INTENT_TTL_MS),
    );
    if (expired.length === 0) {
      return;
    }
    await this.photoRepository.deletePendingByIds(expired.map((photo) => photo.id));
    for (const photo of expired) {
      if (photo.storageKey) {
        await this.deleteObjectQuietly(photo.storageKey);
      }
    }
    this.logger.info({ count: expired.length }, 'Expired photo upload intents deleted');
  }

  private async deleteObjectQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error: unknown) {
      // The row is gone; a leftover object is harmless and the next cleanup may retry.
      this.logger.warn({ err: error, key }, 'Stored photo not deleted');
    }
  }

  private async assertCity(cityId: string): Promise<void> {
    if (!(await this.listingRepository.cityExists(cityId))) {
      throw new BusinessRuleException('errors.listing.cityNotFound', {}, 'cityId');
    }
  }

  private async findDetail(
    listingId: string,
    viewerUserId: string | null,
  ): Promise<ViewerDetailRecord> {
    const listing = await this.listingRepository.findDetailById(listingId, viewerUserId);
    if (!listing) {
      throw new ResourceNotFoundException();
    }
    return listing;
  }

  private ownsOrAdministers(
    principal: Principal,
    listing: { landlordId: string | null; agencyId: string | null },
  ): boolean {
    if (principal.hasAuthority(UserRole.ADMIN)) {
      return true;
    }
    const scope = scopeOf(principal);
    return (
      (scope.kind === 'LANDLORD' && listing.landlordId === scope.landlordId) ||
      (scope.kind === 'AGENCY' && listing.agencyId === scope.agencyId)
    );
  }

  /** A photo's public URL: the external one (seed) or the stored object's. */
  private photoUrl(photo: { url: string | null; storageKey: string | null }): string | null {
    return photo.url ?? (photo.storageKey ? this.storage.publicUrl(photo.storageKey) : null);
  }

  private toCard(listing: ListingCardRecord, saved: boolean): ListingCard {
    const cover = listing.photos[0];
    return {
      id: listing.id,
      title: listing.title,
      propertyType: toPropertyType(listing.propertyType),
      kind: toKind(listing.kind),
      price: toMoney(listing.price, listing.currency),
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms.toFixed(1),
      sizeSqft: listing.sizeSqft,
      city: toCity(listing.city),
      neighborhood: listing.neighborhood,
      availableFrom: listing.availableFrom,
      publishedAt: listing.publishedAt,
      coverPhotoUrl: cover ? this.photoUrl(cover) : null,
      saved,
    };
  }

  private toViewerCard(listing: ViewerCardRecord): ListingCard {
    return this.toCard(listing, listing.savedBy.length > 0);
  }

  /** For the saved-listings service (same module): a viewer's card from its record. */
  cardOf(listing: ViewerCardRecord): ListingCard {
    return this.toViewerCard(listing);
  }

  private toManagedCard(listing: ManagedListingCardRecord): ManagedListingCard {
    return {
      ...this.toCard(listing, false),
      status: toStatus(listing.status),
      demo: this.isDemo(listing),
      viewCount: listing._count.views,
      saveCount: listing._count.savedBy,
    };
  }

  private toDetail(
    listing: ListingDetailRecord,
    address: ListingDetail['address'],
    saved = false,
  ): ListingDetail {
    return {
      ...this.toCard(listing, saved),
      demo: this.isDemo(listing),
      description: listing.description,
      furnished: listing.furnished,
      petsAllowed: listing.petsAllowed,
      parking: listing.parking,
      zip: listing.zip,
      photos: listing.photos.flatMap((photo) => {
        const url = this.photoUrl(photo);
        return url ? [{ id: photo.id, url }] : [];
      }),
      listedBy: toListedBy(listing),
      address,
      // Filled by the callers that show a price against the market (the viewer's and the owner's pages).
      priceContext: null,
    };
  }

  private toManaged(listing: ManagedListingRecord, photos: ManagedPhotoRecord[]): ManagedListing {
    return {
      ...this.toDetail(listing, { line1: listing.addressLine1, line2: listing.addressLine2 }),
      status: toStatus(listing.status),
      address: { line1: listing.addressLine1, line2: listing.addressLine2 },
      cityId: listing.cityId,
      viewCount: listing._count.views,
      saveCount: listing._count.savedBy,
      managedPhotos: photos.map((photo) => this.toManagedPhoto(photo)),
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      version: listing.version,
    };
  }

  /** Seeded showcase rows are read-only in the demo only; locally the seed is editable. */
  private isDemo(listing: { isDemo: boolean }): boolean {
    return this.config.isDemo && listing.isDemo;
  }

  private toManagedPhoto(photo: ManagedPhotoRecord): ManagedPhoto {
    if (!isPhotoStatus(photo.status)) {
      // Guarded by ck_listing_photos_status.
      throw new Error('Unknown photo status in database');
    }
    return {
      id: photo.id,
      url: this.photoUrl(photo),
      status: photo.status,
      position: photo.position,
    };
  }
}

/** Object key extension per accepted type. */
const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

/** Today as a UTC day (data.md → Time). */
const utcToday = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const DAY_MS = 86_400_000;
const addDays = (day: Date, days: number): Date => new Date(day.getTime() + days * DAY_MS);
const toDayString = (day: Date): string => day.toISOString().slice(0, 10);

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

const toKind = (value: string): ListingKind => {
  if (!isListingKind(value)) {
    // Guarded by ck_listings_kind.
    throw new Error('Unknown listing kind in database');
  }
  return value;
};

const toPropertyType = (value: string): PropertyType => {
  if (!isPropertyType(value)) {
    // Guarded by ck_listings_property_type.
    throw new Error('Unknown property type in database');
  }
  return value;
};

const toStatus = (value: string): ListingStatus => {
  if (!isListingStatus(value)) {
    // Guarded by ck_listings_status.
    throw new Error('Unknown listing status in database');
  }
  return value;
};

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
