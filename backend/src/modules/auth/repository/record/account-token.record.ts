import type { Prisma } from '../../../../generated/prisma/client';

/** A token being redeemed: whose it is and whether it is still valid. */
export const accountTokenSelect = {
  id: true,
  userId: true,
  purpose: true,
  expiresAt: true,
} satisfies Prisma.AccountTokenSelect;
export type AccountTokenRecord = Prisma.AccountTokenGetPayload<{
  select: typeof accountTokenSelect;
}>;
