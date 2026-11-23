import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { ClsMiddleware } from 'nestjs-cls';

import { AppConfigService } from './common/config/app-config.service';
import { CLS_MIDDLEWARE_OPTIONS } from './common/context/context.module';
import { TRACE_ID_HEADER } from './common/context/trace-id';
import { SECONDS_PER_DAY } from './common/time/units';
import { buildOpenApiDocument } from './openapi';

const DOCS_PATH = 'docs';
const API_PATH_PREFIX = '/api/';
const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';
const DAYS_PER_YEAR = 365;
const HSTS_MAX_AGE_SECONDS = DAYS_PER_YEAR * SECONDS_PER_DAY;

/**
 * Everything between creating the Nest app and listening, in PLAT-1 order: helmet → cookie-parser → CORS → CLS →
 * the JSON body parser (its errors already carry the trace id); pipes, filters and interceptors are global providers
 * (app.module.ts). PLAT-7: the body limit and the server's timeouts come from config, HSTS only where it is enabled.
 * API-8: every API answer is `no-store` — even the public catalogue carries the caller's own state (`isSaved`, the
 * exact address) once signed in; a handler that streams sets its own header after this default.
 */
export const setupApp = (app: NestExpressApplication): void => {
    const config = app.get(AppConfigService);
    const trustProxyHops = config.get('TRUST_PROXY_HOPS');
    app.set('trust proxy', trustProxyHops > 0 ? trustProxyHops : false);
    app.disable('x-powered-by');
    applyServerTimeouts(app, config);

    const isSwaggerEnabled = config.get('SWAGGER_ENABLED');
    const strictHelmet = helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
        },
        strictTransportSecurity: config.get('HSTS_ENABLED')
            ? { maxAge: HSTS_MAX_AGE_SECONDS, includeSubDomains: true }
            : false,
        xFrameOptions: { action: 'deny' },
        referrerPolicy: { policy: 'no-referrer' },
    });
    const docsHelmet = helmet({ contentSecurityPolicy: false, strictTransportSecurity: false });
    app.use((request: Request, response: Response, next: NextFunction) => {
        response.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
        if (request.path.startsWith(API_PATH_PREFIX)) {
            response.setHeader('Cache-Control', 'no-store');
        }
        const isDocs = isSwaggerEnabled && request.path.startsWith(`/${DOCS_PATH}`);
        (isDocs ? docsHelmet : strictHelmet)(request, response, next);
    });
    app.use(cookieParser());
    app.enableCors({
        origin: config.get('CORS_ALLOWED_ORIGINS'),
        credentials: true,
        exposedHeaders: ['Deprecation', 'Sunset', 'Retry-After', TRACE_ID_HEADER],
    });
    app.use(new ClsMiddleware(CLS_MIDDLEWARE_OPTIONS).use);
    app.useBodyParser('json', { limit: config.get('HTTP_BODY_LIMIT_BYTES') });
    app.enableShutdownHooks();

    if (isSwaggerEnabled) {
        SwaggerModule.setup(DOCS_PATH, app, buildOpenApiDocument(app, config.get('SESSION_COOKIE_NAME')));
    }
};

const applyServerTimeouts = (app: NestExpressApplication, config: AppConfigService): void => {
    const server = app.getHttpServer();
    server.requestTimeout = config.get('HTTP_REQUEST_TIMEOUT_MS');
    server.headersTimeout = config.get('HTTP_HEADERS_TIMEOUT_MS');
    server.keepAliveTimeout = config.get('HTTP_KEEP_ALIVE_TIMEOUT_MS');
};
