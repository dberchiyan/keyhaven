import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ListingController } from './controller/listing.controller';
import { ManagedListingController } from './controller/managed-listing.controller';
import { ManagedListingPhotoController } from './controller/managed-listing-photo.controller';
import { SavedListingController } from './controller/saved-listing.controller';
import { ListingRepository } from './repository/listing.repository';
import { ListingInsightRepository } from './repository/listing-insight.repository';
import { ListingMarketRepository } from './repository/listing-market.repository';
import { ListingPhotoRepository } from './repository/listing-photo.repository';
import { ListingSearchRepository } from './repository/listing-search.repository';
import { SavedListingRepository } from './repository/saved-listing.repository';
import { ListingService } from './service/listing.service';
import { ListingCardService } from './service/listing-card.service';
import { ListingInsightService } from './service/listing-insight.service';
import { ListingMarketService } from './service/listing-market.service';
import { ListingPhotoService } from './service/listing-photo.service';
import { ListingPrivacyService } from './service/listing-privacy.service';
import { SavedListingService } from './service/saved-listing.service';

/**
 * CORE-16: ListingService is exported because saved searches run the same search for their digests;
 * ListingPrivacyService for the privacy module's export and erasure (DATA-23).
 */
@Module({
    imports: [AuditModule, StorageModule],
    controllers: [ListingController, ManagedListingController, ManagedListingPhotoController, SavedListingController],
    providers: [
        ListingService,
        ListingCardService,
        ListingMarketService,
        ListingInsightService,
        ListingPhotoService,
        ListingPrivacyService,
        SavedListingService,
        ListingRepository,
        ListingSearchRepository,
        ListingMarketRepository,
        ListingInsightRepository,
        ListingPhotoRepository,
        SavedListingRepository,
    ],
    exports: [ListingService, ListingPrivacyService],
})
export class ListingModule {}
