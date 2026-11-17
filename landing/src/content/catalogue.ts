import snapshot from './catalogue.json';

/**
 * The catalogue as of the snapshot (`npm run snapshot`, scripts/snapshot-catalogue.ts): what the
 * prerendered city pages show. Figures are the seed's at that date; the app has the live ones.
 */
export type Kind = 'RENT' | 'SALE';

export interface SnapshotHome {
    id: string;
    title: string;
    propertyType: string;
    price: string;
    bedrooms: number;
    bathrooms: string;
    sizeSqft: number;
    neighborhood: string | null;
    availableFrom: string | null;
    coverPhotoUrl: string | null;
}

export interface CityKind {
    total: number;
    medianPrice: string | null;
    types: Record<string, number>;
    neighborhoods: Record<string, number>;
    newest: SnapshotHome[];
}

export const CATALOGUE = snapshot as {
    takenAt: string;
    cities: Record<string, Record<Kind, CityKind>>;
};

export const TYPE_LABELS: Record<string, string> = {
    APARTMENT: 'Apartments',
    HOUSE: 'Houses',
    CONDO: 'Condos',
    TOWNHOUSE: 'Townhouses',
    STUDIO: 'Studios',
};

/** "$2,550" — whole dollars, from the decimal string (no float arithmetic on money). */
export const dollars = (amount: string): string =>
    `$${Number.parseInt(amount.split('.')[0] ?? '0', 10).toLocaleString('en-US')}`;
