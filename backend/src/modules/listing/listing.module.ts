import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ListingController } from './controller/listing.controller';
import { ManagedListingController } from './controller/managed-listing.controller';
import { ListingRepository } from './repository/listing.repository';
import { ListingService } from './service/listing.service';

@Module({
  imports: [AuditModule],
  controllers: [ListingController, ManagedListingController],
  providers: [ListingService, ListingRepository],
  exports: [ListingService],
})
export class ListingModule {}
