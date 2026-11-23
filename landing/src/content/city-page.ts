import type { Kind } from './catalogue-schema';

export interface CityKindCopy {
    segment: 'rent' | 'buy';
    browseKind: 'rent' | 'sale';
    metaTitle: string;
    metaDescription: string;
    crumb: string;
    crumbHref: string;
    title: string;
    lead: string;
    statHomes: string;
    statMedian: string;
    perMonth: boolean;
    switchTo: string;
    newest: string;
    shareKind: string;
}

export interface CityPageContent {
    breadcrumb: string;
    home: string;
    statTypes: string;
    noMedian: string;
    asOf: string;
    openAll: string;
    neighborhoods: string;
    neighborhoodsLabel: string;
    seeAll: string;
    kinds: Record<Kind, CityKindCopy>;
}

export const CITY_PAGE: CityPageContent = {
    breadcrumb: 'You are here',
    home: 'Keyhaven',
    statTypes: 'By type',
    noMedian: 'None listed',
    asOf: 'Figures from the catalogue on {date}. The app shows the live ones.',
    openAll: 'See all {count} homes',
    neighborhoods: 'Neighborhoods in {city}',
    neighborhoodsLabel: 'Search a neighborhood of {city}',
    seeAll: 'See them all in the catalogue',
    kinds: {
        RENT: {
            segment: 'rent',
            browseKind: 'rent',
            metaTitle: 'Homes for rent in {city} · Keyhaven',
            metaDescription:
                '{count} homes for rent in {city}, median rent {median} a month: apartments, houses, condos, studios. Filter by neighborhood, price, beds, move-in date.',
            crumb: 'Rent',
            crumbHref: '/browse?kind=rent',
            title: 'Homes for rent in {city}',
            lead: 'Every published rental in {city}, with the monthly rent, the move-in date and the terms up front. Open the catalogue to filter by neighborhood, price, beds, baths, pets and furnishing.',
            statHomes: 'Homes for rent',
            statMedian: 'Median rent',
            perMonth: true,
            switchTo: 'Homes for sale instead',
            newest: 'Newest rentals in {city}',
            shareKind: 'For rent',
        },
        SALE: {
            segment: 'buy',
            browseKind: 'sale',
            metaTitle: 'Homes for sale in {city} · Keyhaven',
            metaDescription:
                '{count} homes for sale in {city}, median asking price {median}: houses, condos, townhouses, apartments. Filter by neighborhood, price, beds and type.',
            crumb: 'Buy',
            crumbHref: '/browse?kind=sale',
            title: 'Homes for sale in {city}',
            lead: 'Every home for sale in {city}, with the asking price and what it works out to per square foot. Open the catalogue to filter by neighborhood, price, beds, baths and type.',
            statHomes: 'Homes for sale',
            statMedian: 'Median asking price',
            perMonth: false,
            switchTo: 'Homes for rent instead',
            newest: 'Newest homes for sale in {city}',
            shareKind: 'For sale',
        },
    },
};
