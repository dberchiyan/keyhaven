import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiPageable, type Pageable, PageableQuery } from '../../../common/dto/pageable';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { toDecimal } from '../../../common/persistence/money';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import type { ListingCriteria } from '../service/filter/listing.criteria';
import { LISTING_PAGEABLE, type ListingSortField } from '../service/listing-sort';
import { ListingService, toSearchTerms } from '../service/listing.service';
import { ListingFilterQuery } from './dto/listing-filter.query';
import { CitiesResponse, ListingDetailResponse, ListingPageResponse } from './dto/listing.response';
import {
  toCityResponse,
  toListingDetailResponse,
  toListingPageResponse,
} from './mapper/listing.mapper';

/** The search query, field by field, into the service's criteria (never passed on as is). */
export const toListingCriteria = (query: ListingFilterQuery): ListingCriteria => ({
  ...(query.city === undefined ? {} : { citySlug: query.city }),
  ...(query.rentMin === undefined ? {} : { rentMin: toDecimal(query.rentMin) }),
  ...(query.rentMax === undefined ? {} : { rentMax: toDecimal(query.rentMax) }),
  ...(query.beds === undefined ? {} : { bedroomsMin: query.beds }),
  ...(query.baths === undefined ? {} : { bathroomsMin: toDecimal(query.baths) }),
  ...(query.pets === undefined ? {} : { petsAllowed: query.pets }),
  ...(query.furnished === undefined ? {} : { furnished: query.furnished }),
  ...(query.parking === undefined ? {} : { parking: query.parking }),
  ...(query.availableBy === undefined
    ? {}
    : { availableBy: new Date(`${query.availableBy}T00:00:00Z`) }),
  searchTerms: toSearchTerms(query.q),
});

/** What a tenant sees: published homes. */
@ApiTags('Listings')
@Controller('api/v1')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get('cities')
  @Authorize(can.browseListings)
  @ApiOperation({ summary: 'The cities Keyhaven serves (search filter values)' })
  @ZodResponse({ status: HttpStatus.OK, type: CitiesResponse })
  @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED')
  async cities(): Promise<CitiesResponse> {
    return { content: (await this.listingService.cities()).map(toCityResponse) };
  }

  @Get('listings')
  @Authorize(can.browseListings)
  @ApiOperation({
    summary:
      'Search published listings: city, rent range, beds, baths, pets, furnished, parking, available-by date and typo-tolerant text',
  })
  @ApiPageable(LISTING_PAGEABLE)
  @ZodResponse({ status: HttpStatus.OK, type: ListingPageResponse })
  @ApiErrors('VALIDATION_FAILED', 'INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED')
  async search(
    @CurrentPrincipal() principal: Principal,
    @Query() query: ListingFilterQuery,
    @PageableQuery(LISTING_PAGEABLE) pageable: Pageable<ListingSortField>,
  ): Promise<ListingPageResponse> {
    return toListingPageResponse(
      await this.listingService.search(toListingCriteria(query), pageable, principal.userId),
    );
  }

  @Get('listings/:listingId')
  @Authorize(can.viewListing)
  @ApiOperation({
    summary: 'One listing; the exact address is included only for its owner and admins',
  })
  @ZodResponse({ status: HttpStatus.OK, type: ListingDetailResponse })
  @ApiErrors('INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED', 'RESOURCE_NOT_FOUND')
  async findOne(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('listingId') listingId: string,
  ): Promise<ListingDetailResponse> {
    return toListingDetailResponse(await this.listingService.findForViewer(principal, listingId));
  }
}
