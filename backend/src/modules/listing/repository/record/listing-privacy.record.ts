import type { Prisma } from '@/generated/prisma/client';

export const savedHomeExportSelect = {
    listingId: true,
    createdAt: true,
    listing: { select: { title: true } },
} satisfies Prisma.SavedListingSelect;
export type SavedHomeExportRecord = Prisma.SavedListingGetPayload<{ select: typeof savedHomeExportSelect }>;

export const ownedListingExportSelect = {
    id: true,
    title: true,
    status: true,
    createdAt: true,
} satisfies Prisma.ListingSelect;
export type OwnedListingExportRecord = Prisma.ListingGetPayload<{ select: typeof ownedListingExportSelect }>;
