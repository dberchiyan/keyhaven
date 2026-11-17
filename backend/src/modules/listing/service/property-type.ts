/** Mirrored by ck_listings_property_type. */
export const PropertyType = {
    APARTMENT: 'APARTMENT',
    HOUSE: 'HOUSE',
    CONDO: 'CONDO',
    TOWNHOUSE: 'TOWNHOUSE',
    STUDIO: 'STUDIO',
} as const;
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const PROPERTY_TYPES = Object.values(PropertyType) as [PropertyType, ...PropertyType[]];

export const isPropertyType = (value: string): value is PropertyType =>
    (PROPERTY_TYPES as readonly string[]).includes(value);
