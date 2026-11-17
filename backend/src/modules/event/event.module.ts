import { Module } from '@nestjs/common';
import { EventController } from './controller/event.controller';
import { EventService } from './service/event.service';

/** Live events (SSE): the services that change a person's data publish here after commit. */
@Module({
    controllers: [EventController],
    providers: [EventService],
    exports: [EventService],
})
export class EventModule {}
