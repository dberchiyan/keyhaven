import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { ListingModule } from '../listing/listing.module';
import { SavedSearchController } from './controller/saved-search.controller';
import { SavedSearchRepository } from './repository/saved-search.repository';
import { SavedSearchService } from './service/saved-search.service';

/**
 * Saved searches and their daily digest (saved-search → listing, email; never back). CORE-16: SavedSearchService is
 * exported for the privacy module's export and erasure (DATA-23).
 */
@Module({
    imports: [ListingModule, EmailModule],
    controllers: [SavedSearchController],
    providers: [SavedSearchService, SavedSearchRepository],
    exports: [SavedSearchService],
})
export class SavedSearchModule {}
