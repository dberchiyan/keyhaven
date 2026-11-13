import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiPageable, type Pageable, PageableQuery } from '../../../common/dto/pageable';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import { LISTING_PAGEABLE, type ListingSortField } from '../service/listing-sort';
import { ListingService } from '../service/listing.service';
import { ListingFilterQuery } from './dto/listing-filter.query';
import { CitiesResponse, ListingDetailResponse, ListingPageResponse } from './dto/listing.response';
import {
  toCityResponse,
  toListingDetailResponse,
  toListingPageResponse,
} from './mapper/listing.mapper';

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
  @ApiOperation({ summary: 'A page of published listings, newest first' })
  @ApiPageable(LISTING_PAGEABLE)
  @ZodResponse({ status: HttpStatus.OK, type: ListingPageResponse })
  @ApiErrors('VALIDATION_FAILED', 'INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED')
  async search(
    @Query() query: ListingFilterQuery,
    @PageableQuery(LISTING_PAGEABLE) pageable: Pageable<ListingSortField>,
  ): Promise<ListingPageResponse> {
    return toListingPageResponse(
      await this.listingService.search(
        { ...(query.city === undefined ? {} : { citySlug: query.city }) },
        pageable,
      ),
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
