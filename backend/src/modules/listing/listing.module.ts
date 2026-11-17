import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ListingController } from './controller/listing.controller';
import { ManagedListingController } from './controller/managed-listing.controller';
import { SavedListingController } from './controller/saved-listing.controller';
import { ListingPhotoRepository } from './repository/listing-photo.repository';
import { ListingRepository } from './repository/listing.repository';
import { SavedListingRepository } from './repository/saved-listing.repository';
import { ListingService } from './service/listing.service';
import { SavedListingService } from './service/saved-listing.service';

@Module({
    imports: [AuditModule, StorageModule],
    controllers: [ListingController, ManagedListingController, SavedListingController],
    providers: [ListingService, SavedListingService, ListingRepository, ListingPhotoRepository, SavedListingRepository],
    // ListingService: saved searches run the same search for their digests.
    exports: [ListingService],
})
export class ListingModule {}
