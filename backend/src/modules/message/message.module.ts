import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { EventModule } from '../event/event.module';
import { StorageModule } from '../storage/storage.module';
import { MessageController } from './controller/message.controller';
import { MessageRepository } from './repository/message.repository';
import { MessagePrivacyRepository } from './repository/message-privacy.repository';
import { ConversationQueryService } from './service/conversation-query.service';
import { MessageService } from './service/message.service';
import { MessageNotifier } from './service/message-notifier.service';
import { MessagePrivacyService } from './service/message-privacy.service';

/**
 * Messages: a conversation per confirmed viewing. CORE-17: message → viewing's value sets, email, storage; viewing
 * never imports message. CORE-16: MessagePrivacyService is exported for the privacy module (DATA-23).
 */
@Module({
    imports: [EmailModule, EventModule, StorageModule],
    controllers: [MessageController],
    providers: [
        MessageService,
        ConversationQueryService,
        MessageNotifier,
        MessagePrivacyService,
        MessageRepository,
        MessagePrivacyRepository,
    ],
    exports: [MessagePrivacyService],
})
export class MessageModule {}
