import { z } from 'zod';

export const AUDIT_TEXT_MAX_LENGTH = 255;
const AUDIT_STATUS_MAX_LENGTH = 32;
const MAX_AUDIT_CHANGES = 32;

export const AuditValueSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'), text: z.string().max(AUDIT_TEXT_MAX_LENGTH) }),
    z.object({ kind: z.literal('status'), status: z.string().max(AUDIT_STATUS_MAX_LENGTH) }),
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
    from: AuditValueSchema.nullable(),
    to: AuditValueSchema.nullable(),
});
export type AuditChange = z.infer<typeof AuditChangeSchema>;

export const AuditChangesSchema = z.array(AuditChangeSchema).max(MAX_AUDIT_CHANGES);

export const auditValue = {
    text: (text: string): AuditValue => ({ kind: 'text', text: text.slice(0, AUDIT_TEXT_MAX_LENGTH) }),
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
    return (
        leftKeys.length === Object.keys(right).length &&
        leftKeys.every((key) => key in right && isSameJson(Reflect.get(left, key), Reflect.get(right, key)))
    );
};

/** DATA-33: no event without a real change — equal values give no entry. Typed values: personal data is `redacted`. */
export const changeOf = (field: AuditField, from: AuditValue | null, to: AuditValue | null): AuditChange[] =>
    isSameJson(from, to) ? [] : [{ field, from, to }];
