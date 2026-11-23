import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { AppConfigService } from '@/common/config/app-config.service';
import { ConcurrentModificationException, ResourceNotFoundException } from '@/common/exception/api.exception';
import { JobLock } from '@/common/persistence/job-lock';
import { JobName } from '@/common/persistence/job-name';
import { toDecimal } from '@/common/persistence/money';
import { Clock } from '@/common/time/clock';
import { EmailSender } from '@/modules/email/service/email-sender';
import type { ListingCriteria } from '@/modules/listing/service/filter/listing.criteria';
import { ListingService, toSearchTerms } from '@/modules/listing/service/listing.service';

import type { SavedSearchRecord } from '../repository/record/saved-search.record';
import { SavedSearchRepository } from '../repository/saved-search.repository';
import { digestEmail } from './digest-email';
import type {
    CreateSavedSearchCommand,
    DigestSummary,
    SavedSearch,
    UpdateSavedSearchCommand,
} from './saved-search.types';
import { type SavedSearchCriteria, SavedSearchCriteriaSchema } from './saved-search-criteria';
import { SavedSearchError } from './saved-search-errors';
import { MAX_SAVED_SEARCHES } from './saved-search-limits';

/** DATA-8: one digest email lists this many homes; the rest are only counted. */
const MAX_DIGEST_LISTINGS = 10;

/** A saved search's filters as the listing service's criteria (the same parsing as the query). */
export const toCriteria = (criteria: SavedSearchCriteria, publishedAfter?: Date): ListingCriteria => ({
    kind: criteria.kind ?? 'RENT',
    ...(criteria.city === undefined ? {} : { citySlug: criteria.city }),
    ...(criteria.type === undefined ? {} : { propertyType: criteria.type }),
    ...(criteria.priceMin === undefined ? {} : { priceMin: toDecimal(criteria.priceMin) }),
    ...(criteria.priceMax === undefined ? {} : { priceMax: toDecimal(criteria.priceMax) }),
    ...(criteria.beds === undefined ? {} : { bedroomsMin: criteria.beds }),
    ...(criteria.baths === undefined ? {} : { bathroomsMin: toDecimal(criteria.baths) }),
    ...(criteria.isPetFriendly === undefined ? {} : { isPetFriendly: criteria.isPetFriendly }),
    ...(criteria.isFurnished === undefined ? {} : { isFurnished: criteria.isFurnished }),
    ...(criteria.hasParking === undefined ? {} : { hasParking: criteria.hasParking }),
    ...(criteria.moveInOn === undefined ? {} : { moveInOn: new Date(`${criteria.moveInOn}T00:00:00Z`) }),
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
        private readonly jobLock: JobLock,
        private readonly clock: Clock,
        @InjectPinoLogger(SavedSearchService.name) private readonly logger: PinoLogger,
    ) {}

    async list(userId: string): Promise<SavedSearch[]> {
        return (await this.savedSearchRepository.findByUser(userId)).map(toSavedSearch);
    }

    /** DATA-23: the criteria are personal data, so they go with the account; joins the caller's transaction. */
    async deleteAllForUser(userId: string): Promise<void> {
        await this.savedSearchRepository.deleteByUser(userId);
    }

    async create(userId: string, command: CreateSavedSearchCommand): Promise<SavedSearch> {
        const id = await this.createRow(userId, command);
        return this.find(userId, id);
    }

    async update(userId: string, id: string, command: UpdateSavedSearchCommand): Promise<SavedSearch> {
        const before = await this.find(userId, id);
        if (before.name === command.name && before.hasEmailAlerts === command.hasEmailAlerts) {
            return before;
        }
        const updated = await this.savedSearchRepository.update(userId, id, command.version, {
            name: command.name,
            hasEmailAlerts: command.hasEmailAlerts,
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
        await this.jobLock.runExclusive(JobName.SEND_SAVED_SEARCH_DIGESTS, async () => {
            const summary = await this.sendDigests(this.clock.now());
            this.logger.info(summary, 'Saved-search digests sent');
        });
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
                { page: 0, size: MAX_DIGEST_LISTINGS, sort: { field: 'publishedAt', direction: 'desc' } },
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

    /** DATA-22: the criteria are validated again on the way in, so the stored document is always the schema's. */
    @Transactional()
    private async createRow(userId: string, command: CreateSavedSearchCommand): Promise<string> {
        if ((await this.savedSearchRepository.countByUser(userId)) >= MAX_SAVED_SEARCHES) {
            throw SavedSearchError.tooMany();
        }
        const criteria = SavedSearchCriteriaSchema.parse(command.criteria);
        return this.savedSearchRepository.create(userId, command.name, criteria, command.hasEmailAlerts);
    }
}

/** DATA-22: a stored document that no longer parses shows as "everything" rather than failing the list. */
const toSavedSearch = (record: SavedSearchRecord): SavedSearch => {
    const criteria = SavedSearchCriteriaSchema.safeParse(record.criteria);
    return {
        id: record.id,
        name: record.name,
        criteria: criteria.success ? criteria.data : {},
        hasEmailAlerts: record.hasEmailAlerts,
        lastNotifiedAt: record.lastNotifiedAt,
        createdAt: record.createdAt,
        version: record.version,
    };
};
