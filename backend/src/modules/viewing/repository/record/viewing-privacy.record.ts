import { z } from 'zod';

import type { Prisma } from '@/generated/prisma/client';

export const tenantViewingExportSelect = {
    startsAt: true,
    endsAt: true,
    status: true,
    message: true,
    listing: { select: { title: true } },
} satisfies Prisma.ViewingSelect;
export type TenantViewingExportRecord = Prisma.ViewingGetPayload<{ select: typeof tenantViewingExportSelect }>;

export const cancelledViewingRowsSchema = z.array(
    z.object({
        id: z.string(),
        previousStatus: z.string(),
        tenantId: z.string(),
        landlordId: z.string().nullable(),
        agencyId: z.string().nullable(),
        title: z.string(),
    }),
);
export type CancelledViewingRecord = z.infer<typeof cancelledViewingRowsSchema>[number];
