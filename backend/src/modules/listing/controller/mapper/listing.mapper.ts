import { toUtcDay } from '@/common/time/utc-day';
import type {
    ListingCard,
    ListingCity,
    ListingDetail,
    ListingInsights,
    ManagedInsights,
    ManagedListing,
    ManagedListingCard,
} from '@/modules/listing/service/listing.types';

import type {
    CitiesResponse,
    ListingDetailBody,
    ListingPageResponse,
    ManagedListingBody,
    ManagedListingPageResponse,
} from '../dto/listing.response';
import type { ListingInsightsBody, ManagedInsightsBody } from '../dto/listing-insights.response';

type CityItem = CitiesResponse['content'][number];
type CardItem = ListingPageResponse['content'][number];

export const toCityResponse = (city: ListingCity): CityItem => ({
    id: city.id,
    name: city.name,
    state: city.state,
    slug: city.slug,
    timeZone: city.timeZone,
});

export const toListingCardResponse = (listing: ListingCard): CardItem => ({
    id: listing.id,
    title: listing.title,
    propertyType: listing.propertyType,
    kind: listing.kind,
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sizeSqft: listing.sizeSqft,
    city: toCityResponse(listing.city),
    neighborhood: listing.neighborhood,
    availableOn: listing.availableOn ? toUtcDay(listing.availableOn) : null,
    publishedAt: listing.publishedAt?.toISOString() ?? null,
    coverPhotoUrl: listing.coverPhotoUrl,
    viewCount: listing.viewCount,
    isSaved: listing.isSaved,
});

export const toListingCardsResponse = (cards: ListingCard[]): { content: CardItem[] } => ({
    content: cards.map(toListingCardResponse),
});

export const toListingPageResponse = (page: {
    content: ListingCard[];
    totalElements: number;
}): ListingPageResponse => ({
    content: page.content.map(toListingCardResponse),
    totalElements: page.totalElements,
});

type ManagedCardItem = ManagedListingPageResponse['content'][number];

export const toManagedListingCardResponse = (listing: ManagedListingCard): ManagedCardItem => ({
    ...toListingCardResponse(listing),
    status: listing.status,
    isDemo: listing.isDemo,
    saveCount: listing.saveCount,
});

export const toManagedListingPageResponse = (page: {
    content: ManagedListingCard[];
    totalElements: number;
}): ManagedListingPageResponse => ({
    content: page.content.map(toManagedListingCardResponse),
    totalElements: page.totalElements,
});

export const toListingInsightsResponse = (insights: ListingInsights): ListingInsightsBody => ({
    from: insights.from,
    to: insights.to,
    period: insights.period,
    series: insights.series.map((point) => ({
        day: point.day,
        views: point.views,
        saves: point.saves,
    })),
    totals: { views: insights.totals.views, saves: insights.totals.saves },
    previous: { views: insights.previous.views, saves: insights.previous.saves },
});

export const toManagedInsightsResponse = (insights: ManagedInsights): ManagedInsightsBody => ({
    ...toListingInsightsResponse(insights),
    top: insights.top.map((row) => ({
        listing: toManagedListingCardResponse(row.listing),
        views: row.views,
        saves: row.saves,
    })),
});

export const toListingDetailResponse = (listing: ListingDetail): ListingDetailBody => ({
    ...toListingCardResponse(listing),
    isDemo: listing.isDemo,
    description: listing.description,
    isFurnished: listing.isFurnished,
    isPetFriendly: listing.isPetFriendly,
    hasParking: listing.hasParking,
    zip: listing.zip,
    photos: listing.photos,
    listedBy: listing.listedBy,
    address: listing.address,
    priceContext: listing.priceContext,
});

export const toManagedListingResponse = (listing: ManagedListing): ManagedListingBody => ({
    ...toListingDetailResponse(listing),
    status: listing.status,
    address: listing.address,
    cityId: listing.cityId,
    saveCount: listing.saveCount,
    managedPhotos: listing.managedPhotos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        status: photo.status,
        position: photo.position,
    })),
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    version: listing.version,
});
