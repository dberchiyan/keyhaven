import { Module } from '@nestjs/common';
import { S3ObjectStorage } from './adapter/s3/s3-object.storage';
import { ObjectStorage } from './service/object-storage';

/** Object storage behind the `ObjectStorage` port (platform.md → File uploads). */
@Module({
    providers: [{ provide: ObjectStorage, useClass: S3ObjectStorage }],
    exports: [ObjectStorage],
})
export class StorageModule {}
