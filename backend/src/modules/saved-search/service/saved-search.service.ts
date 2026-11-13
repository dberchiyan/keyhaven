import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../../../common/config/app-config.service';
import {
  BusinessRuleException,
  ConcurrentModificationException,
  ResourceNotFoundException,
} from '../../../common/exception/api.exception';
import { toDecimal } from '../../../common/persistence/money';
import { EmailSender } from '../../email/service/email-sender';
import type { ListingCriteria } from '../../listing/service/filter/listing.criteria';
import { ListingService, toSearchTerms } from '../../listing/service/listing.service';
import type { SavedSearchRecord } from '../repository/record/saved-search.record';
import { MAX_SAVED_SEARCHES, SavedSearchRepository } from '../repository/saved-search.repository';
import { digestEmail } from './digest-email';
import { type SavedSearchCriteria, SavedSearchCriteriaSchema } from './saved-search-criteria';
import type {
  CreateSavedSearchCommand,
  DigestSummary,
  SavedSearch,
  UpdateSavedSearchCommand,
} from './saved-search.types';

/** Homes listed in one digest email; the rest are counted. */
const DIGEST_LISTINGS = 10;

/** A saved search's filters as the listing service's criteria (the same parsing as the query). */
export const toCriteria = (
  criteria: SavedSearchCriteria,
  publishedAfter?: Date,
): ListingCriteria => ({
  kind: criteria.kind ?? 'RENT',
  ...(criteria.city === undefined ? {} : { citySlug: criteria.city }),
  ...(criteria.type === undefined ? {} : { propertyType: criteria.type }),
  ...(criteria.priceMin === undefined ? {} : { priceMin: toDecimal(criteria.priceMin) }),
  ...(criteria.priceMax === undefined ? {} : { priceMax: toDecimal(criteria.priceMax) }),
  ...(criteria.beds === undefined ? {} : { bedroomsMin: criteria.beds }),
  ...(criteria.baths === undefined ? {} : { bathroomsMin: toDecimal(criteria.baths) }),
  ...(criteria.pets === undefined ? {} : { petsAllowed: criteria.pets }),
  ...(criteria.furnished === undefined ? {} : { furnished: criteria.furnished }),
  ...(criteria.parking === undefined ? {} : { parking: criteria.parking }),
  ...(criteria.availableBy === undefined
    ? {}
    : { availableBy: new Date(`${criteria.availableBy}T00:00:00Z`) }),
  searchTerms: toSearchTerms(criteria.q),
  ...(publishedAfter === undefined ? {} : { publishedAfter }),
});

/**
 * A tenant's saved searches and their daily digest: once a day each search with alerts on
 * emails the homes published since its last digest (or since it was saved).
 */
@Injectable()
export class SavedSearchService {
  constructor(
    private readonly savedSearchRepository: SavedSearchRepository,
    private readonly listingService: ListingService,
    private readonly emailSender: EmailSender,
    private readonly config: AppConfigService,
    @InjectPinoLogger(SavedSearchService.name) private readonly logger: PinoLogger,
  ) {}

  async list(userId: string): Promise<SavedSearch[]> {
    return (await this.savedSearchRepository.findByUser(userId)).map(toSavedSearch);
  }

  async create(userId: string, command: CreateSavedSearchCommand): Promise<SavedSearch> {
    const id = await this.createRow(userId, command);
    return this.find(userId, id);
  }

  @Transactional()
  private async createRow(userId: string, command: CreateSavedSearchCommand): Promise<string> {
    if ((await this.savedSearchRepository.countByUser(userId)) >= MAX_SAVED_SEARCHES) {
      throw new BusinessRuleException('errors.savedSearch.tooMany', { max: MAX_SAVED_SEARCHES });
    }
    // Validated again on the way in, so the document is always the schema's.
    const criteria = SavedSearchCriteriaSchema.parse(command.criteria);
    return this.savedSearchRepository.create(userId, command.name, criteria, command.emailAlerts);
  }

  async update(
    userId: string,
    id: string,
    command: UpdateSavedSearchCommand,
  ): Promise<SavedSearch> {
    const before = await this.find(userId, id);
    if (before.name === command.name && before.emailAlerts === command.emailAlerts) {
      return before;
    }
    const updated = await this.savedSearchRepository.update(userId, id, command.version, {
      name: command.name,
      emailAlerts: command.emailAlerts,
    });
    if (!updated) {
      throw new ConcurrentModificationException();
    }
    return this.find(userId, id);
  }

  remove(userId: string, id: string): Promise<void> {
    return this.savedSearchRepository.remove(userId, id);
  }

  async find(userId: string, id: string): Promise<SavedSearch> {
    const search = await this.savedSearchRepository.findById(userId, id);
    if (!search) {
      throw new ResourceNotFoundException();
    }
    return toSavedSearch(search);
  }

  /** Every morning (UTC). Idempotent: a search is marked before its email goes out. */
  @Cron('0 8 * * *', { timeZone: 'UTC' })
  async sendDailyDigests(): Promise<void> {
    const summary = await this.sendDigests(new Date());
    this.logger.info(summary, 'Saved-search digests sent');
  }

  /**
   * One run: for each search with alerts on, the homes published since its last digest. The
   * search is marked notified in its own transaction before the email is sent (no network I/O
   * inside a transaction); a failed delivery is logged and those homes are not resent.
   */
  async sendDigests(now: Date): Promise<DigestSummary> {
    const searches = await this.savedSearchRepository.findForDigest();
    let emails = 0;
    for (const search of searches) {
      const criteria = SavedSearchCriteriaSchema.safeParse(search.criteria);
      if (!criteria.success) {
        this.logger.warn({ savedSearchId: search.id }, 'Saved search criteria do not parse');
        continue;
      }
      const since = search.lastNotifiedAt ?? search.createdAt;
      const matches = await this.listingService.search(
        toCriteria(criteria.data, since),
        { page: 0, size: DIGEST_LISTINGS, sort: { field: 'publishedAt', direction: 'desc' } },
        null,
      );
      await this.savedSearchRepository.markNotified(search.id, now);
      if (matches.content.length === 0) {
        continue;
      }
      try {
        await this.emailSender.send(
          digestEmail(
            search.user.email,
            search.user.firstName,
            search.name,
            matches.content,
            this.config.get('APP_URL'),
            matches.totalElements,
          ),
        );
        emails += 1;
      } catch (error: unknown) {
        this.logger.warn({ err: error, savedSearchId: search.id }, 'Digest not delivered');
      }
    }
    return { searches: searches.length, emails };
  }
}

const toSavedSearch = (record: SavedSearchRecord): SavedSearch => {
  const criteria = SavedSearchCriteriaSchema.safeParse(record.criteria);
  return {
    id: record.id,
    name: record.name,
    // A document that no longer parses shows as "everything" rather than failing the list.
    criteria: criteria.success ? criteria.data : {},
    emailAlerts: record.emailAlerts,
    lastNotifiedAt: record.lastNotifiedAt,
    createdAt: record.createdAt,
    version: record.version,
  };
};
