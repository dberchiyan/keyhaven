import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { UuidParam } from '@/common/dto/uuid-param';
import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt, Idempotent } from '@/common/idempotency/idempotent.decorator';
import { toActor } from '@/common/security/actor';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { Authorize } from '@/common/security/security.decorators';

import { ViewingService } from '../service/viewing.service';
import { ViewingQueryService } from '../service/viewing-query.service';
import { ViewingSlotService } from '../service/viewing-slot.service';
import { ViewingSlotsQuery } from './dto/viewing.query';
import { RequestViewingRequest, ViewingNoteRequest } from './dto/viewing.request';
import { ViewingListResponse, ViewingResponse, ViewingSlotsResponse } from './dto/viewing.response';
import { toViewingResponse, toViewingSlotsResponse } from './mapper/viewing.mapper';

/** The tenant's side of viewings: open slots, a request, their own list; the owner's answers. */
@ApiTags('Viewings')
@Controller('api/v1')
export class ViewingController {
    constructor(
        private readonly viewingService: ViewingService,
        private readonly viewingQueryService: ViewingQueryService,
        private readonly viewingSlotService: ViewingSlotService,
    ) {}

    @Get('listings/:listingId/viewing-slots')
    @Authorize(can.viewListingSlots)
    @ApiOperation({
        summary:
            "The slots a tenant can book, by the city's local day, from the owner's hours — minus the notice, the days off and the slots already held",
        operationId: 'listViewingSlots',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingSlotsResponse })
    async slots(
        @UuidParam('listingId') listingId: string,
        @Query() query: ViewingSlotsQuery,
    ): Promise<ViewingSlotsResponse> {
        return toViewingSlotsResponse(await this.viewingSlotService.slots(listingId, query.from, query.days));
    }

    @Post('viewings')
    @Authorize(can.requestViewing)
    @Idempotent()
    @ApiOperation({
        summary:
            'Ask for a viewing in one of the offered slots (tenants, verified email); the slot is held until the owner answers',
        operationId: 'requestViewing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors('RESOURCE_NOT_FOUND', 'VIEWING_SLOT_TAKEN', 'BUSINESS_RULE_VIOLATION')
    async request(
        @CurrentPrincipal() principal: Principal,
        @Body() request: RequestViewingRequest,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.request(
                {
                    listingId: request.listingId,
                    startsAt: new Date(request.startsAt),
                    message: request.message ? request.message : null,
                },
                toActor(principal),
            ),
        );
    }

    @Get('viewings')
    @Authorize(can.viewOwnViewings)
    @ApiOperation({ summary: "The caller's viewings, latest slot first (at most 100)", operationId: 'listOwnViewings' })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingListResponse })
    async listOwn(@CurrentPrincipal() principal: Principal): Promise<ViewingListResponse> {
        return {
            content: (await this.viewingQueryService.listOwn(principal.userId)).map(toViewingResponse),
        };
    }

    @Get('viewings/:viewingId')
    @Authorize(can.viewViewing)
    @ApiOperation({ summary: 'One viewing: its tenant, the home’s owner or an admin', operationId: 'findViewing' })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    async findOne(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
    ): Promise<ViewingResponse> {
        return toViewingResponse(await this.viewingQueryService.findOne(viewingId, toActor(principal)));
    }

    @Post('viewings/:viewingId/confirmation')
    @Authorize(can.decideViewing)
    @IdempotencyExempt('Confirming a confirmed viewing again changes nothing')
    @ApiOperation({
        summary: 'Confirm a request (the owner); the tenant gets the exact address',
        operationId: 'confirmViewing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors('CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async confirm(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.decide(viewingId, { transition: 'confirm', note: null }, toActor(principal)),
        );
    }

    @Post('viewings/:viewingId/declination')
    @Authorize(can.decideViewing)
    @IdempotencyExempt('Declining a declined request again changes nothing')
    @ApiOperation({
        summary: 'Decline a request (the owner), with an optional note to the tenant',
        operationId: 'declineViewing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors('CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async decline(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
        @Body() request: ViewingNoteRequest,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.decide(
                viewingId,
                { transition: 'decline', note: request.note ? request.note : null },
                toActor(principal),
            ),
        );
    }

    @Post('viewings/:viewingId/cancellation')
    @Authorize(can.cancelViewing)
    @IdempotencyExempt('Cancelling a cancelled viewing again changes nothing')
    @ApiOperation({
        summary: 'Call a viewing off: the tenant their own (requested or confirmed), the owner a confirmed one',
        operationId: 'cancelViewing',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors('CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async cancel(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
        @Body() request: ViewingNoteRequest,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.decide(
                viewingId,
                { transition: 'cancel', note: request.note ? request.note : null },
                toActor(principal),
            ),
        );
    }
}
