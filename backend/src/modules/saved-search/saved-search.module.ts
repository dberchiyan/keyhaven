import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ListingModule } from '../listing/listing.module';
import { SavedSearchController } from './controller/saved-search.controller';
import { SavedSearchRepository } from './repository/saved-search.repository';
import { SavedSearchService } from './service/saved-search.service';

/** Saved searches and their daily digest (saved-search → listing, email; never back). */
@Module({
    imports: [ListingModule, EmailModule],
    controllers: [SavedSearchController],
    providers: [SavedSearchService, SavedSearchRepository],
})
export class SavedSearchModule {}
