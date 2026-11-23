import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ListingModule } from '../listing/listing.module';
import { MessageModule } from '../message/message.module';
import { SavedSearchModule } from '../saved-search/saved-search.module';
import { UserModule } from '../user/user.module';
import { ViewingModule } from '../viewing/viewing.module';
import { PrivacyController } from './controller/privacy.controller';
import { PrivacyService } from './service/privacy.service';

/**
 * DATA-23: export and erasure of a person's data. No repository: it composes the services every module exports
 * for it (CORE-13, CORE-16); nothing imports this module (CORE-17).
 */
@Module({
    imports: [UserModule, AuthModule, AuditModule, SavedSearchModule, ListingModule, ViewingModule, MessageModule],
    controllers: [PrivacyController],
    providers: [PrivacyService],
})
export class PrivacyModule {}
