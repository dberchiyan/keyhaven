import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';
import { ManagedViewingController } from './controller/managed-viewing.controller';
import { ViewingController } from './controller/viewing.controller';
import { ViewingScheduleRepository } from './repository/viewing-schedule.repository';
import { ViewingRepository } from './repository/viewing.repository';
import { ViewingScheduleService } from './service/viewing-schedule.service';
import { ViewingService } from './service/viewing.service';

/** Viewings (M2): hours, slots, requests and answers (viewing → audit, email, storage; never back into listing's code). */
@Module({
  imports: [AuditModule, EmailModule, StorageModule],
  controllers: [ViewingController, ManagedViewingController],
  providers: [ViewingService, ViewingScheduleService, ViewingRepository, ViewingScheduleRepository],
})
export class ViewingModule {}
