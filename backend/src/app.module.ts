import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

import { AppConfigService } from './common/config/app-config.service';
import { AppConfigModule } from './common/config/config.module';
import { ContextModule } from './common/context/context.module';
import { GlobalExceptionFilter } from './common/exception/global-exception.filter';
import { AppI18nModule } from './common/i18n/i18n.module';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';
import { createLoggerOptions } from './common/observability/logger.options';
import { ObservabilityModule } from './common/observability/observability.module';
import { TimingInterceptor } from './common/observability/timing.interceptor';
import { PersistenceModule } from './common/persistence/persistence.module';
import { AuthorizationGuard } from './common/security/authorization.guard';
import { CsrfGuard } from './common/security/csrf.guard';
import { DemoGuard } from './common/security/demo.guard';
import { JsonOnlyMiddleware } from './common/security/json-only.middleware';
import { RateLimitGuard } from './common/security/rate-limit.guard';
import { SecurityModule } from './common/security/security.module';
import { SessionGuard } from './common/security/session.guard';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { EventModule } from './modules/event/event.module';
import { ListingModule } from './modules/listing/listing.module';
import { MessageModule } from './modules/message/message.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { SavedSearchModule } from './modules/saved-search/saved-search.module';
import { StorageModule } from './modules/storage/storage.module';
import { UserModule } from './modules/user/user.module';
import { ViewingModule } from './modules/viewing/viewing.module';

/**
 * Guards run in registration order: the session first, the demo guard after authorisation, so foreign ids still answer
 * 404 (AUTH-9). Interceptors run outermost first: timing measures everything; idempotency stores the serialized
 * response (API-5).
 */
@Module({
    imports: [
        AppConfigModule,
        LoggerModule.forRootAsync({
            inject: [AppConfigService],
            useFactory: (config: AppConfigService) => createLoggerOptions(config.isDev, config.get('LOG_LEVEL')),
        }),
        ContextModule,
        PersistenceModule,
        AppI18nModule,
        ObservabilityModule,
        SecurityModule,
        ScheduleModule.forRoot(),
        UserModule,
        AuditModule,
        EmailModule,
        EventModule,
        AuthModule,
        StorageModule,
        ListingModule,
        SavedSearchModule,
        ViewingModule,
        MessageModule,
        PrivacyModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
        { provide: APP_GUARD, useClass: RateLimitGuard },
        { provide: APP_GUARD, useClass: AuthorizationGuard },
        { provide: APP_GUARD, useClass: DemoGuard },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_INTERCEPTOR, useClass: TimingInterceptor },
        { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
        { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(JsonOnlyMiddleware).forRoutes('*path');
    }
}
