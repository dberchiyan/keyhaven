import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SavedListingRepository } from '../repository/saved-listing.repository';
import { ListingService } from './listing.service';
import type { ListingCard } from './listing.types';

/** A tenant's saved homes (the policy made sure the listing is published). */
@Injectable()
export class SavedListingService {
  constructor(
    private readonly savedListingRepository: SavedListingRepository,
    private readonly listingService: ListingService,
    @InjectPinoLogger(SavedListingService.name) private readonly logger: PinoLogger,
  ) {}

  /** Saving twice is a no-op. */
  async save(userId: string, listingId: string): Promise<void> {
    if (await this.savedListingRepository.save(userId, listingId)) {
      this.logger.info({ userId, listingId }, 'Listing saved');
    }
  }

  async remove(userId: string, listingId: string): Promise<void> {
    await this.savedListingRepository.remove(userId, listingId);
  }

  async findPage(
    userId: string,
    page: { page: number; size: number },
  ): Promise<{ content: ListingCard[]; totalElements: number }> {
    const result = await this.savedListingRepository.findSavedPage(userId, {
      skip: page.page * page.size,
      take: page.size,
    });
    return {
      content: result.content.map((listing) => this.listingService.cardOf(listing)),
      totalElements: result.totalElements,
    };
  }
}
