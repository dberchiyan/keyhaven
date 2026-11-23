import { ClsServiceManager } from 'nestjs-cls';
import type { Params } from 'nestjs-pino';

const PINO_INFO_LEVEL = 30;

const NEST_BOOTSTRAP_CONTEXTS: ReadonlySet<string> = new Set([
    'NestFactory',
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'NestApplication',
    'ClsModule',
]);

const currentTraceId = (): string | undefined => {
    const cls = ClsServiceManager.getClsService();
    return cls.isActive() ? cls.getId() : undefined;
};

const REDACTED_PATHS = [
    'req.headers.cookie',
    'req.headers.authorization',
    'res.headers["set-cookie"]',
    '*.password',
    '*.passwordHash',
    '*.temporaryPassword',
    '*.token',
    '*.secret',
    '*.cookie',
] as const;

/** Nest's bootstrap chatter is logged at `log` level and dropped, so only our own code logs at info. */
const isNestBootstrapLine = (first: unknown, level: number): boolean =>
    level <= PINO_INFO_LEVEL &&
    typeof first === 'object' &&
    first !== null &&
    'context' in first &&
    typeof first.context === 'string' &&
    NEST_BOOTSTRAP_CONTEXTS.has(first.context);

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const PRETTY_TRANSPORT = {
    target: 'pino-pretty',
    options: { singleLine: true, translateTime: 'SYS:standard' },
} as const;

/**
 * OBS-1, OBS-5: one JSON object per line (what a log collector reads), secrets, cookies and tokens redacted from
 * every line; only local development (APP_ENV=dev) prints through pino-pretty, a dev dependency.
 */
export const createLoggerOptions = (isDev: boolean, level: LogLevel): Params => ({
    pinoHttp: {
        level,
        autoLogging: false,
        quietReqLogger: true,
        ...(isDev ? { transport: PRETTY_TRANSPORT } : {}),
        mixin: () => {
            const traceId = currentTraceId();
            return traceId ? { traceId } : {};
        },
        redact: { paths: [...REDACTED_PATHS], censor: '[redacted]' },
        hooks: {
            logMethod(args, method, level) {
                if (!isNestBootstrapLine(args[0], level)) {
                    method.apply(this, args);
                }
            },
        },
    },
});
