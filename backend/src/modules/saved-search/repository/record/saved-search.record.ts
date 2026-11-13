import type { Prisma } from '../../../../generated/prisma/client';

export const savedSearchSelect = {
  id: true,
  userId: true,
  name: true,
  criteria: true,
  emailAlerts: true,
  lastNotifiedAt: true,
  createdAt: true,
  version: true,
  user: { select: { email: true, firstName: true } },
} satisfies Prisma.SavedSearchSelect;
export type SavedSearchRecord = Prisma.SavedSearchGetPayload<{ select: typeof savedSearchSelect }>;
