import { z } from 'astro/zod';

export const KINDS = ['RENT', 'SALE'] as const;

export type Kind = (typeof KINDS)[number];

export const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'STUDIO'] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

const DECIMAL = /^\d+(\.\d+)?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const SnapshotHomeSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    propertyType: z.enum(PROPERTY_TYPES),
    price: z.string().regex(DECIMAL),
    bedrooms: z.number().int().nonnegative(),
    bathrooms: z.string().regex(DECIMAL),
    sizeSqft: z.number().int().positive(),
    neighborhood: z.string().nullable(),
    availableOn: z.string().regex(DAY).nullable(),
    coverPhotoUrl: z.url().nullable(),
});

export type SnapshotHome = z.infer<typeof SnapshotHomeSchema>;

export const CityKindSchema = z.object({
    total: z.number().int().nonnegative(),
    medianPrice: z.string().regex(DECIMAL).nullable(),
    types: z.partialRecord(z.enum(PROPERTY_TYPES), z.number().int()),
    neighborhoods: z.record(z.string(), z.number().int()),
    newest: z.array(SnapshotHomeSchema),
});

export type CityKind = z.infer<typeof CityKindSchema>;

export const CatalogueSchema = z.object({
    takenOn: z.string().regex(DAY),
    cities: z.record(z.string(), z.object({ RENT: CityKindSchema, SALE: CityKindSchema })),
});

export type Catalogue = z.infer<typeof CatalogueSchema>;
