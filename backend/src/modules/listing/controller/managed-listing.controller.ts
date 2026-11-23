import { Body, Controller, Get, HttpStatus, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { ApiPageable, type Pageable, PageableQuery } from '@/common/dto/pageable';
import { UuidParam } from '@/common/dto/uuid-param';
import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt, Idempotent } from '@/common/idempotency/idempotent.decorator';
import { toDecimal } from '@/common/persistence/money';
import { toActor } from '@/common/security/actor';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { Authorize } from '@/common/security/security.decorators';

import { ListingService, toSearchTerms } from '../service/listing.service';
import type { ListingDraft } from '../service/listing.types';
import { ListingInsightService } from '../service/listing-insight.service';
import { MANAGED_LISTING_PAGEABLE, type ManagedListingSortField } from '../service/listing-sort';
import {
    ListingStatusCountsResponse,
    ManagedListingPageResponse,
    ManagedListingResponse,
} from './dto/listing.response';
import { CreateListingRequest, UpdateListingRequest } from './dto/listing-draft.request';
import { ManagedListingFilterQuery } from './dto/listing-filter.query';
import { InsightsQuery } from './dto/listing-insights.query';
import { ListingInsightsResponse, ManagedInsightsResponse } from './dto/listing-insights.response';
import {
    toListingInsightsResponse,
    toManagedInsightsResponse,
    toManagedListingPageResponse,
    toManagedListingResponse,
} from './mapper/listing.mapper';

/** CORE-20: field by field, never passed on as is; a home for sale has no move-in day, whatever the form sent. */
const toDraft = (request: CreateListingRequest): ListingDraft => ({
    title: request.title,
    description: request.description,
    propertyType: request.propertyType,
    kind: request.kind,
    price: toDecimal(request.price),
    bedrooms: request.bedrooms,
    bathrooms: toDecimal(request.bathrooms),
    sizeSqft: request.sizeSqft,
    addressLine1: request.addressLine1,
    addressLine2: request.addressLine2 ?? null,
    cityId: request.cityId,
    neighborhood: request.neighborhood ?? null,
    zip: request.zip,
    isPetFriendly: request.isPetFriendly,
    isFurnished: request.isFurnished,
    hasParking: request.hasParking,
    availableOn: request.kind === 'RENT' && request.availableOn ? new Date(`${request.availableOn}T00:00:00Z`) : null,
});

/** The owner's side: a landlord's own listings, an agency's for its agents, everything for admins. */
@ApiTags('Managed listings')
@Controller('api/v1/managed-listings')
export class ManagedListingController {
    constructor(
        private readonly listingService: ListingService,
        private readonly insightService: ListingInsightService,
    ) {}

    @Get()
    @Authorize(can.manageListings)
    @ApiOperation({
        summary: 'A page of the listings the caller manages, last changed first',
        operationId: 'listManagedListings',
    })
    @ApiPageable(MANAGED_LISTING_PAGEABLE)
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingPageResponse })
    async findPage(
        @CurrentPrincipal() principal: Principal,
        @Query() query: ManagedListingFilterQuery,
        @PageableQuery(MANAGED_LISTING_PAGEABLE) pageable: Pageable<ManagedListingSortField>,
    ): Promise<ManagedListingPageResponse> {
        return toManagedListingPageResponse(
            await this.listingService.findManagedPage(
                {
                    ...(query.status === undefined ? {} : { status: query.status }),
                    searchTerms: toSearchTerms(query.search),
                },
                pageable,
                toActor(principal),
            ),
        );
    }

    @Post()
    @Authorize(can.createListing)
    @Idempotent()
    @ApiOperation({
        summary: 'Create a draft listing (a landlord’s own, or the agent’s agency’s)',
        operationId: 'createListing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    @ApiErrors('RESOURCE_NOT_FOUND', 'CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async create(
        @CurrentPrincipal() principal: Principal,
        @Body() request: CreateListingRequest,
    ): Promise<ManagedListingResponse> {
        return toManagedListingResponse(await this.listingService.create(toDraft(request), toActor(principal)));
    }

    @Get('status-counts')
    @Authorize(can.manageListings)
    @ApiOperation({
        summary: 'How many listings the caller manages in each status',
        operationId: 'countManagedListingsByStatus',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ListingStatusCountsResponse })
    statusCounts(@CurrentPrincipal() principal: Principal): Promise<ListingStatusCountsResponse> {
        return this.listingService.countByStatus(toActor(principal));
    }

    @Get('insights')
    @Authorize(can.manageListings)
    @ApiOperation({
        summary:
            'Views and saves per day over the listings the caller manages, against the period before, with the busiest listings',
        operationId: 'findManagedInsights',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedInsightsResponse })
    async insights(
        @CurrentPrincipal() principal: Principal,
        @Query() query: InsightsQuery,
    ): Promise<ManagedInsightsResponse> {
        return toManagedInsightsResponse(await this.insightService.findInsights(query.period, toActor(principal)));
    }

    @Get(':listingId')
    @Authorize(can.manageListing)
    @ApiOperation({
        summary: 'One of the listings the caller manages, with its exact address',
        operationId: 'findManagedListing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    async findOne(@UuidParam('listingId') listingId: string): Promise<ManagedListingResponse> {
        return toManagedListingResponse(await this.listingService.findManaged(listingId));
    }

    @Get(':listingId/insights')
    @Authorize(can.manageListing)
    @ApiOperation({
        summary: 'One listing’s views and saves per day, against the period before',
        operationId: 'findListingInsights',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ListingInsightsResponse })
    async listingInsights(
        @UuidParam('listingId') listingId: string,
        @Query() query: InsightsQuery,
    ): Promise<ListingInsightsResponse> {
        return toListingInsightsResponse(await this.insightService.findListingInsights(listingId, query.period));
    }

    @Put(':listingId')
    @Authorize(can.editListing)
    @ApiOperation({
        summary: 'Edit a listing’s details (owner, verified email); `version` guards the save',
        operationId: 'updateListing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    @ApiErrors('CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async update(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
        @Body() request: UpdateListingRequest,
    ): Promise<ManagedListingResponse> {
        return toManagedListingResponse(
            await this.listingService.update(
                listingId,
                { ...toDraft(request), version: request.version },
                toActor(principal),
            ),
        );
    }

    @Post(':listingId/publication')
    @Authorize(can.publishListing)
    @IdempotencyExempt('Publishing an already published listing is a no-op')
    @ApiOperation({
        summary: 'Publish a draft or unpublished listing (owner, verified email, at least one photo)',
        operationId: 'publishListing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    @ApiErrors('VALIDATION_FAILED', 'CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async publish(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
    ): Promise<ManagedListingResponse> {
        return toManagedListingResponse(await this.listingService.transition(listingId, 'publish', toActor(principal)));
    }

    @Post(':listingId/unpublication')
    @Authorize(can.publishListing)
    @IdempotencyExempt('Unpublishing an already unpublished listing is a no-op')
    @ApiOperation({
        summary: 'Take a published listing off the site (owner, verified email)',
        operationId: 'unpublishListing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    @ApiErrors('VALIDATION_FAILED', 'CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async unpublish(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
    ): Promise<ManagedListingResponse> {
        return toManagedListingResponse(
            await this.listingService.transition(listingId, 'unpublish', toActor(principal)),
        );
    }

    @Post(':listingId/suspension')
    @Authorize(can.suspendListing)
    @IdempotencyExempt('Suspending an already suspended listing is a no-op')
    @ApiOperation({
        summary: 'Take a listing off the site as an admin; its owner cannot publish it again',
        operationId: 'suspendListing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    @ApiErrors('CONCURRENT_MODIFICATION')
    async suspend(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
    ): Promise<ManagedListingResponse> {
        return toManagedListingResponse(await this.listingService.transition(listingId, 'suspend', toActor(principal)));
    }
}
