import type { Prisma } from '@/generated/prisma/client';

export const accountTokenSelect = {
    id: true,
    userId: true,
    purpose: true,
    expiresAt: true,
} satisfies Prisma.AccountTokenSelect;
export type AccountTokenRecord = Prisma.AccountTokenGetPayload<{
    select: typeof accountTokenSelect;
}>;
