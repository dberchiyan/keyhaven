import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { SECURITY_CATEGORIES } from '@/modules/audit/service/security-category';

import { type CursorPage, cursorPageSchema, cursorQueryShape, encodeCursor } from './cursor';

export const SECURITY_ACTIONS = [
    'auth.signed_in',
    'auth.sign_in_failed',
    'auth.signed_out',
    'auth.email_verified',
    'auth.password_changed',
    'auth.password_reset',
    'auth.session_ended',
    'auth.other_sessions_ended',
    'auth.session_evicted',
    'auth.sign_in_locked',
] as const;
export type SecurityAction = (typeof SECURITY_ACTIONS)[number];
export const isSecurityAction = (action: string): action is SecurityAction =>
    (SECURITY_ACTIONS as readonly string[]).includes(action);

export const SecurityEventSchema = z
    .object({
        id: z.uuid(),
        action: z.enum(SECURITY_ACTIONS),
        occurredAt: z.iso.datetime(),
        ip: z.string().nullable(),
        userAgent: z.string().nullable(),
        isNewDevice: z.boolean(),
    })
    .meta({ id: 'SecurityEvent' });

export const SecurityEventPageSchema = cursorPageSchema(SecurityEventSchema);
export type SecurityEventPageBody = z.infer<typeof SecurityEventPageSchema>;

/** Maps the audit service's page; only auth.* actions belong here. */
export const toSecurityEventPage = (
    page: CursorPage<{
        id: string;
        occurredAt: Date;
        action: string;
        ipAddress: string | null;
        userAgent: string | null;
        isNewDevice: boolean;
    }>,
): SecurityEventPageBody => ({
    content: page.content.flatMap((event) =>
        isSecurityAction(event.action)
            ? [
                  {
                      id: event.id,
                      action: event.action,
                      occurredAt: event.occurredAt.toISOString(),
                      ip: event.ipAddress,
                      userAgent: event.userAgent,
                      isNewDevice: event.isNewDevice,
                  },
              ]
            : [],
    ),
    nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
});

export const SecurityLogQuerySchema = z.object({
    category: z.enum(SECURITY_CATEGORIES, { error: 'validation.invalid' }).optional(),
    ...cursorQueryShape,
});
export class SecurityLogQuery extends createZodDto(SecurityLogQuerySchema) {}
