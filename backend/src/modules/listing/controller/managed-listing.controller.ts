import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiPageable, type Pageable, PageableQuery } from '../../../common/dto/pageable';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { IdempotencyExempt } from '../../../common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import { MANAGED_LISTING_PAGEABLE, type ManagedListingSortField } from '../service/listing-sort';
import { ListingService, toSearchTerms } from '../service/listing.service';
import { ManagedListingFilterQuery } from './dto/listing-filter.query';
import {
  ListingStatusCountsResponse,
  ManagedListingPageResponse,
  ManagedListingResponse,
} from './dto/listing.response';
import { toManagedListingPageResponse, toManagedListingResponse } from './mapper/listing.mapper';

/** The owner's side: a landlord's own listings, an agency's for its agents, everything for admins. */
@ApiTags('Managed listings')
@Controller('api/v1/managed-listings')
export class ManagedListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  @Authorize(can.manageListings)
  @ApiOperation({ summary: 'A page of the listings the caller manages, last changed first' })
  @ApiPageable(MANAGED_LISTING_PAGEABLE)
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingPageResponse })
  @ApiErrors(
    'VALIDATION_FAILED',
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
  )
  async findPage(
    @CurrentPrincipal() principal: Principal,
    @Query() query: ManagedListingFilterQuery,
    @PageableQuery(MANAGED_LISTING_PAGEABLE) pageable: Pageable<ManagedListingSortField>,
  ): Promise<ManagedListingPageResponse> {
    return toManagedListingPageResponse(
      await this.listingService.findManagedPage(
        principal,
        {
          ...(query.status === undefined ? {} : { status: query.status }),
          searchTerms: toSearchTerms(query.search),
        },
        pageable,
      ),
    );
  }

  @Get('status-counts')
  @Authorize(can.manageListings)
  @ApiOperation({ summary: 'How many listings the caller manages in each status' })
  @ZodResponse({ status: HttpStatus.OK, type: ListingStatusCountsResponse })
  @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
  statusCounts(@CurrentPrincipal() principal: Principal): Promise<ListingStatusCountsResponse> {
    return this.listingService.countByStatus(principal);
  }

  @Get(':listingId')
  @Authorize(can.manageListing)
  @ApiOperation({ summary: 'One of the listings the caller manages, with its exact address' })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
  )
  async findOne(@UuidParam('listingId') listingId: string): Promise<ManagedListingResponse> {
    return toManagedListingResponse(await this.listingService.findManaged(listingId));
  }

  @Post(':listingId/publication')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.publishListing)
  @IdempotencyExempt('Publishing an already published listing is a no-op')
  @ApiOperation({ summary: 'Publish a draft or unpublished listing (owner, verified email)' })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'EMAIL_NOT_VERIFIED',
    'RESOURCE_NOT_FOUND',
    'CONCURRENT_MODIFICATION',
    'BUSINESS_RULE_VIOLATION',
  )
  async publish(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('listingId') listingId: string,
  ): Promise<ManagedListingResponse> {
    return toManagedListingResponse(
      await this.listingService.transition(principal, listingId, 'publish'),
    );
  }

  @Post(':listingId/unpublication')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.publishListing)
  @IdempotencyExempt('Unpublishing an already unpublished listing is a no-op')
  @ApiOperation({ summary: 'Take a published listing off the site (owner, verified email)' })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'EMAIL_NOT_VERIFIED',
    'RESOURCE_NOT_FOUND',
    'CONCURRENT_MODIFICATION',
    'BUSINESS_RULE_VIOLATION',
  )
  async unpublish(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('listingId') listingId: string,
  ): Promise<ManagedListingResponse> {
    return toManagedListingResponse(
      await this.listingService.transition(principal, listingId, 'unpublish'),
    );
  }

  @Post(':listingId/suspension')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.suspendListing)
  @IdempotencyExempt('Suspending an already suspended listing is a no-op')
  @ApiOperation({
    summary: 'Take a listing off the site as an admin; its owner cannot publish it again',
  })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
    'CONCURRENT_MODIFICATION',
  )
  async suspend(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('listingId') listingId: string,
  ): Promise<ManagedListingResponse> {
    return toManagedListingResponse(
      await this.listingService.transition(principal, listingId, 'suspend'),
    );
  }
}
