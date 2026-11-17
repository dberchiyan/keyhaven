import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { EventModule } from '../event/event.module';
import { StorageModule } from '../storage/storage.module';
import { MessageController } from './controller/message.controller';
import { MessageRepository } from './repository/message.repository';
import { MessageService } from './service/message.service';

/** Messages: a conversation per confirmed viewing (message → viewing's value sets, email, storage; viewing never imports message). */
@Module({
    imports: [EmailModule, EventModule, StorageModule],
    controllers: [MessageController],
    providers: [MessageService, MessageRepository],
})
export class MessageModule {}
