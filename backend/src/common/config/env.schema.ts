import { z } from 'zod';

const MAX_PORT = 65_535;
const MAX_DB_POOL_SIZE = 100;
const MAX_TRUST_PROXY_HOPS = 10;
const DOMAIN_MAX_LENGTH = 253;
const SMTP_URL_MAX_LENGTH = 1024;
const EMAIL_FROM_MIN_LENGTH = 3;
const EMAIL_FROM_MAX_LENGTH = 254;
const ENDPOINT_URL_MAX_LENGTH = 512;
const REGION_MAX_LENGTH = 32;
const BUCKET_NAME_MIN_LENGTH = 3;
const BUCKET_NAME_MAX_LENGTH = 63;
const ACCESS_KEY_MAX_LENGTH = 128;

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const commaSeparated = z
    .string()
    .min(1)
    .transform((value) =>
        value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
    );

const postgresUrl = z.url().refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), {
    message: 'must be a postgresql:// URL',
});

export const EmailTransport = {
    LOG: 'log',
    SMTP: 'smtp',
} as const;
export type EmailTransport = (typeof EmailTransport)[keyof typeof EmailTransport];

export const envSchema = z.object({
    APP_ENV: z.enum(['dev', 'prod']),
    NODE_ENV: z.enum(['development', 'production']),
    PORT: z.coerce.number().int().min(1).max(MAX_PORT),
    TZ: z.literal('UTC'),
    APP_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
    DATABASE_URL: postgresUrl,
    DB_POOL_SIZE: z.coerce.number().int().min(1).max(MAX_DB_POOL_SIZE),
    DB_QUERY_LOG: booleanString.default(false),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(MAX_TRUST_PROXY_HOPS),
    SESSION_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    COOKIE_DOMAIN: z
        .string()
        .max(DOMAIN_MAX_LENGTH)
        .optional()
        .transform((value) => (value ? value : undefined)),
    COOKIE_SECURE: booleanString,
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']),
    SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().min(1),
    SESSION_ABSOLUTE_TIMEOUT_MINUTES: z.coerce.number().int().min(1),
    CORS_ALLOWED_ORIGINS: commaSeparated.pipe(z.array(z.url()).min(1)),
    SUPPORTED_LOCALES: commaSeparated.pipe(z.array(z.string().regex(/^[a-z]{2}$/)).min(1)),
    EMAIL_TRANSPORT: z.enum([EmailTransport.LOG, EmailTransport.SMTP]),
    SMTP_URL: z
        .string()
        .max(SMTP_URL_MAX_LENGTH)
        .optional()
        .transform((value) => (value ? value : undefined)),
    EMAIL_FROM: z.string().min(EMAIL_FROM_MIN_LENGTH).max(EMAIL_FROM_MAX_LENGTH),
    R2_ENDPOINT: z.url(),
    R2_INTERNAL_ENDPOINT: z
        .string()
        .max(ENDPOINT_URL_MAX_LENGTH)
        .optional()
        .transform((value) => (value ? value : undefined))
        .pipe(z.url().optional()),
    R2_REGION: z.string().min(1).max(REGION_MAX_LENGTH).default('auto'),
    R2_BUCKET: z.string().min(BUCKET_NAME_MIN_LENGTH).max(BUCKET_NAME_MAX_LENGTH),
    R2_ACCESS_KEY: z.string().min(1).max(ACCESS_KEY_MAX_LENGTH),
    R2_SECRET_KEY: z.string().min(1).max(ACCESS_KEY_MAX_LENGTH),
    R2_PUBLIC_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
    DEMO_MODE: booleanString.default(false),
    DEMO_PROTECTED_EMAILS: z
        .string()
        .optional()
        .transform((value) =>
            (value ?? '')
                .split(',')
                .map((item) => item.trim().toLowerCase())
                .filter((item) => item.length > 0),
        )
        .pipe(z.array(z.email())),
});

export type Env = z.infer<typeof envSchema>;

/**
 * PLAT-2: boot fails on a bad value. Cross-field rules: an idle timeout longer than the absolute one would never
 * apply; the `__Host-` prefix makes the browser enforce Secure, Path=/ and no Domain (no subdomain can set or shadow
 * the cookie), so it only works when the config matches.
 */
export const validateEnv = (raw: Record<string, unknown>): Env => {
    const result = envSchema.safeParse(raw);
    if (!result.success) {
        const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
        throw new Error(`Invalid environment configuration: ${fields}`);
    }
    if (result.data.SESSION_IDLE_TIMEOUT_MINUTES > result.data.SESSION_ABSOLUTE_TIMEOUT_MINUTES) {
        throw new Error(
            'Invalid environment configuration: SESSION_IDLE_TIMEOUT_MINUTES must not exceed SESSION_ABSOLUTE_TIMEOUT_MINUTES',
        );
    }
    if (
        result.data.SESSION_COOKIE_NAME.startsWith('__Host-') &&
        (!result.data.COOKIE_SECURE || result.data.COOKIE_DOMAIN)
    ) {
        throw new Error(
            'Invalid environment configuration: a __Host- SESSION_COOKIE_NAME requires COOKIE_SECURE=true and an empty COOKIE_DOMAIN',
        );
    }
    if (result.data.COOKIE_SAME_SITE === 'none' && !result.data.COOKIE_SECURE) {
        throw new Error('Invalid environment configuration: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
    }
    if (result.data.EMAIL_TRANSPORT === EmailTransport.SMTP && !result.data.SMTP_URL) {
        throw new Error('Invalid environment configuration: EMAIL_TRANSPORT=smtp requires SMTP_URL');
    }
    return result.data;
};
