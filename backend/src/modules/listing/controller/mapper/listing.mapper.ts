import type {
  ListingCard,
  ListingCity,
  ListingDetail,
  ManagedListing,
  ManagedListingCard,
} from '../../service/listing.types';
import type {
  CitiesResponse,
  ListingDetailBody,
  ListingPageResponse,
  ManagedListingBody,
  ManagedListingPageResponse,
} from '../dto/listing.response';

type CityItem = CitiesResponse['content'][number];
type CardItem = ListingPageResponse['content'][number];

const toDay = (date: Date): string => date.toISOString().slice(0, 10);

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
  availableFrom: listing.availableFrom ? toDay(listing.availableFrom) : null,
  publishedAt: listing.publishedAt?.toISOString() ?? null,
  coverPhotoUrl: listing.coverPhotoUrl,
  saved: listing.saved,
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

export const toManagedListingPageResponse = (page: {
  content: ManagedListingCard[];
  totalElements: number;
}): ManagedListingPageResponse => ({
  content: page.content.map((listing) => ({
    ...toListingCardResponse(listing),
    status: listing.status,
    viewCount: listing.viewCount,
    saveCount: listing.saveCount,
  })),
  totalElements: page.totalElements,
});

export const toListingDetailResponse = (listing: ListingDetail): ListingDetailBody => ({
  ...toListingCardResponse(listing),
  description: listing.description,
  furnished: listing.furnished,
  petsAllowed: listing.petsAllowed,
  parking: listing.parking,
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
  viewCount: listing.viewCount,
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
