import { z } from 'zod';

/**
 * One value in a change summary. Typed, so a client formats it and never parses free text.
 * Personal data is logged as "changed" (`redacted`) without its value.
 */
export const AuditValueSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'), text: z.string().max(255) }),
    z.object({ kind: z.literal('status'), status: z.string().max(32) }),
    z.object({ kind: z.literal('redacted') }),
]);
export type AuditValue = z.infer<typeof AuditValueSchema>;

export const AuditField = {
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    ROLE: 'role',
    STATUS: 'status',
} as const;
export type AuditField = (typeof AuditField)[keyof typeof AuditField];
export const AUDIT_FIELDS = Object.values(AuditField) as [AuditField, ...AuditField[]];

export const AuditChangeSchema = z.object({
    field: z.enum(AUDIT_FIELDS),
    /** null = the field had no value (created), or has none now (deleted / cleared). */
    from: AuditValueSchema.nullable(),
    to: AuditValueSchema.nullable(),
});
export type AuditChange = z.infer<typeof AuditChangeSchema>;

export const AuditChangesSchema = z.array(AuditChangeSchema).max(32);

/** Value builders, so callers never hand-write the tagged shapes. */
export const auditValue = {
    text: (text: string): AuditValue => ({ kind: 'text', text: text.slice(0, 255) }),
    status: (status: string): AuditValue => ({ kind: 'status', status }),
    redacted: (): AuditValue => ({ kind: 'redacted' }),
};

/** Deep equality for JSON values; jsonb reorders object keys, so key order is ignored. */
export const isSameJson = (left: unknown, right: unknown): boolean => {
    if (left === right) {
        return true;
    }
    if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
        return false;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
        return (
            Array.isArray(left) &&
            Array.isArray(right) &&
            left.length === right.length &&
            left.every((item, index) => isSameJson(item, right[index]))
        );
    }
    const leftKeys = Object.keys(left);
    const rightRecord = right as Record<string, unknown>;
    return (
        leftKeys.length === Object.keys(right).length &&
        leftKeys.every(
            (key) => key in rightRecord && isSameJson((left as Record<string, unknown>)[key], rightRecord[key]),
        )
    );
};

/** A change entry, or nothing when before and after are the same. */
export const changeOf = (field: AuditField, from: AuditValue | null, to: AuditValue | null): AuditChange[] =>
    isSameJson(from, to) ? [] : [{ field, from, to }];
