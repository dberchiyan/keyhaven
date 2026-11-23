import { Global, Module } from '@nestjs/common';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Request, Response } from 'express';
import { type ClsMiddlewareOptions, ClsModule } from 'nestjs-cls';

import { PersistenceModule } from '../persistence/persistence.module';
import { PrismaService } from '../persistence/prisma.service';
import { clientIp, clientUserAgent } from '../security/request-client';
import { Clock } from '../time/clock';
import { generateTraceId, TRACE_ID_HEADER } from './trace-id';

export const CLS_MIDDLEWARE_OPTIONS: Omit<ClsMiddlewareOptions, 'mount'> = {
    generateId: true,
    idGenerator: generateTraceId,
    useEnterWith: true,
    setup: (cls, req: Request, res: Response) => {
        res.setHeader(TRACE_ID_HEADER, cls.getId());
        cls.set('requestedAt', new Date());
        cls.set('clientIp', clientIp(req));
        cls.set('userAgent', clientUserAgent(req));
    },
};

/** Global: the request context and its `Clock` are what every module reads "now" and "who" from. */
@Global()
@Module({
    imports: [
        ClsModule.forRoot({
            global: true,
            middleware: { mount: false },
            plugins: [
                new ClsPluginTransactional({
                    imports: [PersistenceModule],
                    adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
                }),
            ],
        }),
    ],
    providers: [Clock],
    exports: [Clock],
})
export class ContextModule {}
