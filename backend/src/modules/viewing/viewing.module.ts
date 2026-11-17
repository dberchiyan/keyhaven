import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { EventModule } from '../event/event.module';
import { StorageModule } from '../storage/storage.module';
import { ManagedViewingController } from './controller/managed-viewing.controller';
import { ViewingController } from './controller/viewing.controller';
import { ViewingRepository } from './repository/viewing.repository';
import { ViewingPrivacyRepository } from './repository/viewing-privacy.repository';
import { ViewingScheduleRepository } from './repository/viewing-schedule.repository';
import { ViewingService } from './service/viewing.service';
import { ViewingJobService } from './service/viewing-job.service';
import { ViewingNotifier } from './service/viewing-notifier.service';
import { ViewingPrivacyService } from './service/viewing-privacy.service';
import { ViewingQueryService } from './service/viewing-query.service';
import { ViewingScheduleService } from './service/viewing-schedule.service';
import { ViewingSlotService } from './service/viewing-slot.service';

/**
 * Viewings (M2): hours, slots, requests and answers. CORE-17: viewing → audit, email, storage; never back into
 * listing's code. CORE-16: ViewingPrivacyService is exported for the privacy module (DATA-23).
 */
@Module({
    imports: [AuditModule, EmailModule, EventModule, StorageModule],
    controllers: [ViewingController, ManagedViewingController],
    providers: [
        ViewingService,
        ViewingQueryService,
        ViewingSlotService,
        ViewingNotifier,
        ViewingPrivacyService,
        ViewingJobService,
        ViewingScheduleService,
        ViewingRepository,
        ViewingScheduleRepository,
        ViewingPrivacyRepository,
    ],
    exports: [ViewingPrivacyService],
})
export class ViewingModule {}
