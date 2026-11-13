import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiPageable, type Pageable, PageableQuery } from '../../../common/dto/pageable';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { Idempotent, IdempotencyExempt } from '../../../common/idempotency/idempotent.decorator';
import { toDecimal } from '../../../common/persistence/money';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import { MANAGED_LISTING_PAGEABLE, type ManagedListingSortField } from '../service/listing-sort';
import { ListingService, toSearchTerms } from '../service/listing.service';
import type { ListingDraft } from '../service/listing.types';
import { CreateListingRequest, UpdateListingRequest } from './dto/listing-draft.request';
import { ManagedListingFilterQuery } from './dto/listing-filter.query';
import {
  PhotoIntentRequest,
  PhotoIntentResponse,
  ReorderPhotosRequest,
} from './dto/listing-photo.request';
import {
  ListingStatusCountsResponse,
  ManagedListingPageResponse,
  ManagedListingResponse,
} from './dto/listing.response';
import { toManagedListingPageResponse, toManagedListingResponse } from './mapper/listing.mapper';

/** The request's fields, one by one, into the service's draft (never passed on as is). */
const toDraft = (request: CreateListingRequest): ListingDraft => ({
  title: request.title,
  description: request.description,
  propertyType: request.propertyType,
  rent: toDecimal(request.rent),
  bedrooms: request.bedrooms,
  bathrooms: toDecimal(request.bathrooms),
  sizeSqft: request.sizeSqft,
  addressLine1: request.addressLine1,
  addressLine2: request.addressLine2 ?? null,
  cityId: request.cityId,
  neighborhood: request.neighborhood ?? null,
  zip: request.zip,
  petsAllowed: request.petsAllowed,
  furnished: request.furnished,
  parking: request.parking,
  availableFrom: new Date(`${request.availableFrom}T00:00:00Z`),
});

const MUTATION_ERRORS = [
  'VALIDATION_FAILED',
  'INVALID_PARAMETER',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'EMAIL_NOT_VERIFIED',
  'RESOURCE_NOT_FOUND',
  'CONCURRENT_MODIFICATION',
  'BUSINESS_RULE_VIOLATION',
] as const;

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

  @Post()
  @HttpCode(HttpStatus.OK)
  @Authorize(can.createListing)
  @Idempotent()
  @ApiOperation({ summary: 'Create a draft listing (a landlord’s own, or the agent’s agency’s)' })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(...MUTATION_ERRORS, 'IDEMPOTENCY_KEY_REUSED')
  async create(
    @CurrentPrincipal() principal: Principal,
    @Body() request: CreateListingRequest,
  ): Promise<ManagedListingResponse> {
    return toManagedListingResponse(await this.listingService.create(principal, toDraft(request)));
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

  @Put(':listingId')
  @Authorize(can.editListing)
  @ApiOperation({
    summary: 'Edit a listing’s details (owner, verified email); `version` guards the save',
  })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(...MUTATION_ERRORS)
  async update(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('listingId') listingId: string,
    @Body() request: UpdateListingRequest,
  ): Promise<ManagedListingResponse> {
    return toManagedListingResponse(
      await this.listingService.update(principal, listingId, {
        ...toDraft(request),
        version: request.version,
      }),
    );
  }

  @Post(':listingId/publication')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.publishListing)
  @IdempotencyExempt('Publishing an already published listing is a no-op')
  @ApiOperation({
    summary: 'Publish a draft or unpublished listing (owner, verified email, at least one photo)',
  })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(...MUTATION_ERRORS)
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
  @ApiErrors(...MUTATION_ERRORS)
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

  @Post(':listingId/photo-intents')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.editListing)
  @Idempotent()
  @ApiOperation({
    summary: 'Start a photo upload: answers a pre-signed URL the browser PUTs the file to',
  })
  @ZodResponse({ status: HttpStatus.OK, type: PhotoIntentResponse })
  @ApiErrors(...MUTATION_ERRORS, 'IDEMPOTENCY_KEY_REUSED', 'UPSTREAM_UNAVAILABLE')
  async createPhotoIntent(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('listingId') listingId: string,
    @Body() request: PhotoIntentRequest,
  ): Promise<PhotoIntentResponse> {
    const intent = await this.listingService.createPhotoIntent(principal, listingId, {
      filename: request.filename,
      contentType: request.contentType,
      sizeBytes: request.sizeBytes,
    });
    return {
      photoId: intent.photoId,
      uploadUrl: intent.uploadUrl,
      headers: intent.headers,
      expiresAt: intent.expiresAt.toISOString(),
    };
  }

  @Post(':listingId/photos/:photoId/confirmation')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.managePhoto)
  @IdempotencyExempt('Confirming a ready photo again changes nothing')
  @ApiOperation({
    summary: 'Finish a photo upload: the object is checked and the photo shown last',
  })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(...MUTATION_ERRORS, 'UPSTREAM_UNAVAILABLE')
  async confirmPhoto(
    @UuidParam('listingId') listingId: string,
    @UuidParam('photoId') photoId: string,
  ): Promise<ManagedListingResponse> {
    return toManagedListingResponse(await this.listingService.confirmPhoto(listingId, photoId));
  }

  @Put(':listingId/photos')
  @Authorize(can.editListing)
  @ApiOperation({ summary: 'Reorder the photos: the complete new order of the ready ones' })
  @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
  @ApiErrors(...MUTATION_ERRORS)
  async reorderPhotos(
    @UuidParam('listingId') listingId: string,
    @Body() request: ReorderPhotosRequest,
  ): Promise<ManagedListingResponse> {
    return toManagedListingResponse(
      await this.listingService.reorderPhotos(listingId, request.photoIds),
    );
  }

  @Delete(':listingId/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authorize(can.managePhoto)
  @ApiOperation({ summary: 'Remove a photo' })
  @ApiErrors(...MUTATION_ERRORS, 'UPSTREAM_UNAVAILABLE')
  async removePhoto(
    @UuidParam('listingId') listingId: string,
    @UuidParam('photoId') photoId: string,
  ): Promise<void> {
    await this.listingService.removePhoto(listingId, photoId);
  }
}
