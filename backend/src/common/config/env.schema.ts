import { z } from 'zod';

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

/** `postgresql://user:pass@host:port/db` — the one connection setting (TASK: `DATABASE_URL`). */
const postgresUrl = z
  .url()
  .refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), {
    message: 'must be a postgresql:// URL',
  });

export const EmailTransport = {
  /** Every message goes to the log (local development without a mail server). */
  LOG: 'log',
  /** Sent through the SMTP server named by SMTP_URL. */
  SMTP: 'smtp',
} as const;
export type EmailTransport = (typeof EmailTransport)[keyof typeof EmailTransport];

export const envSchema = z.object({
  APP_ENV: z.enum(['dev', 'prod']),
  NODE_ENV: z.enum(['development', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  TZ: z.literal('UTC'),
  /** The app's public origin: links in emails point here. */
  APP_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
  DATABASE_URL: postgresUrl,
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(100),
  DB_QUERY_LOG: booleanString.default(false),
  /** Overrides the profile's level (debug in dev, info in prod); `silent` for the tests. */
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10),
  SESSION_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  // Empty → host-only cookie (local development).
  COOKIE_DOMAIN: z
    .string()
    .max(253)
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
    .max(1024)
    .optional()
    .transform((value) => (value ? value : undefined)),
  /** The From header: `Name <address>` or a bare address. */
  EMAIL_FROM: z.string().min(3).max(254),
  // Public demo: actions that would lock other visitors out are refused (off by default).
  DEMO_MODE: booleanString.default(false),
  // The showcase accounts (README) whose password and sessions nobody may change in the demo.
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

export const validateEnv = (raw: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  if (result.data.SESSION_IDLE_TIMEOUT_MINUTES > result.data.SESSION_ABSOLUTE_TIMEOUT_MINUTES) {
    // A longer idle timeout would never apply: the absolute one ends the session first.
    throw new Error(
      'Invalid environment configuration: SESSION_IDLE_TIMEOUT_MINUTES must not exceed SESSION_ABSOLUTE_TIMEOUT_MINUTES',
    );
  }
  // The __Host- prefix makes the browser enforce Secure, Path=/ and no Domain (no subdomain can
  // set or shadow the cookie); it only works when the config matches.
  if (
    result.data.SESSION_COOKIE_NAME.startsWith('__Host-') &&
    (!result.data.COOKIE_SECURE || result.data.COOKIE_DOMAIN)
  ) {
    throw new Error(
      'Invalid environment configuration: a __Host- SESSION_COOKIE_NAME requires COOKIE_SECURE=true and an empty COOKIE_DOMAIN',
    );
  }
  if (result.data.COOKIE_SAME_SITE === 'none' && !result.data.COOKIE_SECURE) {
    throw new Error(
      'Invalid environment configuration: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true',
    );
  }
  if (result.data.EMAIL_TRANSPORT === EmailTransport.SMTP && !result.data.SMTP_URL) {
    throw new Error('Invalid environment configuration: EMAIL_TRANSPORT=smtp requires SMTP_URL');
  }
  return result.data;
};
