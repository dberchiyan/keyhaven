import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { AppConfigService } from './common/config/app-config.service';

const bootstrap = async (): Promise<void> => {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
        bodyParser: false,
    });
    app.useLogger(app.get(Logger));
    const logger = await app.resolve(PinoLogger);
    logger.setContext('Bootstrap');
    process.on('unhandledRejection', (reason) => {
        logger.error({ err: reason }, 'Unhandled rejection');
        process.exit(1);
    });
    process.on('uncaughtException', (error) => {
        logger.error({ err: error }, 'Uncaught exception');
        process.exit(1);
    });

    setupApp(app);
    const config = app.get(AppConfigService);
    await app.listen(config.get('PORT'));
    logger.info({ port: config.get('PORT'), env: config.get('APP_ENV') }, 'Application started');
};

void bootstrap();
