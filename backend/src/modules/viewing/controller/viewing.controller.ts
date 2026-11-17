import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { Idempotent, IdempotencyExempt } from '../../../common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import { ViewingService } from '../service/viewing.service';
import { ViewingSlotsQuery } from './dto/viewing.query';
import { RequestViewingRequest, ViewingNoteRequest } from './dto/viewing.request';
import { ViewingListResponse, ViewingResponse, ViewingSlotsResponse } from './dto/viewing.response';
import { toViewingResponse, toViewingSlotsResponse } from './mapper/viewing.mapper';

/** The tenant's side of viewings: open slots, a request, their own list; the owner's answers. */
@ApiTags('Viewings')
@Controller('api/v1')
export class ViewingController {
    constructor(private readonly viewingService: ViewingService) {}

    @Get('listings/:listingId/viewing-slots')
    @Authorize(can.viewListingSlots)
    @ApiOperation({
        summary:
            "The slots a tenant can book, by the city's local day, from the owner's hours — minus the notice, the days off and the slots already held",
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingSlotsResponse })
    @ApiErrors('VALIDATION_FAILED', 'INVALID_PARAMETER', 'SESSION_EXPIRED', 'RESOURCE_NOT_FOUND')
    async slots(
        @UuidParam('listingId') listingId: string,
        @Query() query: ViewingSlotsQuery,
    ): Promise<ViewingSlotsResponse> {
        return toViewingSlotsResponse(await this.viewingService.slots(listingId, query.from, query.days));
    }

    @Post('viewings')
    @HttpCode(HttpStatus.OK)
    @Authorize(can.requestViewing)
    @Idempotent()
    @ApiOperation({
        summary:
            'Ask for a viewing in one of the offered slots (tenants, verified email); the slot is held until the owner answers',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors(
        'VALIDATION_FAILED',
        'UNAUTHORIZED',
        'SESSION_EXPIRED',
        'FORBIDDEN',
        'EMAIL_NOT_VERIFIED',
        'RESOURCE_NOT_FOUND',
        'VIEWING_SLOT_TAKEN',
        'BUSINESS_RULE_VIOLATION',
        'IDEMPOTENCY_KEY_REUSED',
    )
    async request(
        @CurrentPrincipal() principal: Principal,
        @Body() request: RequestViewingRequest,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.request(principal, {
                listingId: request.listingId,
                startsAt: new Date(request.startsAt),
                message: request.message ? request.message : null,
            }),
        );
    }

    @Get('viewings')
    @Authorize(can.viewOwnViewings)
    @ApiOperation({ summary: "The caller's viewings, latest slot first (at most 100)" })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingListResponse })
    @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
    async listOwn(@CurrentPrincipal() principal: Principal): Promise<ViewingListResponse> {
        return {
            content: (await this.viewingService.listOwn(principal.userId)).map(toViewingResponse),
        };
    }

    @Get('viewings/:viewingId')
    @Authorize(can.viewViewing)
    @ApiOperation({ summary: 'One viewing: its tenant, the home’s owner or an admin' })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors('INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN', 'RESOURCE_NOT_FOUND')
    async findOne(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
    ): Promise<ViewingResponse> {
        return toViewingResponse(await this.viewingService.findOne(principal, viewingId));
    }

    @Post('viewings/:viewingId/confirmation')
    @HttpCode(HttpStatus.OK)
    @Authorize(can.decideViewing)
    @IdempotencyExempt('Confirming a confirmed viewing again changes nothing')
    @ApiOperation({ summary: 'Confirm a request (the owner); the tenant gets the exact address' })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors(
        'INVALID_PARAMETER',
        'UNAUTHORIZED',
        'SESSION_EXPIRED',
        'FORBIDDEN',
        'RESOURCE_NOT_FOUND',
        'BUSINESS_RULE_VIOLATION',
        'CONCURRENT_MODIFICATION',
    )
    async confirm(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.decide(principal, viewingId, { transition: 'confirm', note: null }),
        );
    }

    @Post('viewings/:viewingId/declination')
    @HttpCode(HttpStatus.OK)
    @Authorize(can.decideViewing)
    @IdempotencyExempt('Declining a declined request again changes nothing')
    @ApiOperation({ summary: 'Decline a request (the owner), with an optional note to the tenant' })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors(
        'VALIDATION_FAILED',
        'INVALID_PARAMETER',
        'UNAUTHORIZED',
        'SESSION_EXPIRED',
        'FORBIDDEN',
        'RESOURCE_NOT_FOUND',
        'BUSINESS_RULE_VIOLATION',
        'CONCURRENT_MODIFICATION',
    )
    async decline(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
        @Body() request: ViewingNoteRequest,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.decide(principal, viewingId, {
                transition: 'decline',
                note: request.note ? request.note : null,
            }),
        );
    }

    @Post('viewings/:viewingId/cancellation')
    @HttpCode(HttpStatus.OK)
    @Authorize(can.cancelViewing)
    @IdempotencyExempt('Cancelling a cancelled viewing again changes nothing')
    @ApiOperation({
        summary: 'Call a viewing off: the tenant their own (requested or confirmed), the owner a confirmed one',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingResponse })
    @ApiErrors(
        'VALIDATION_FAILED',
        'INVALID_PARAMETER',
        'UNAUTHORIZED',
        'SESSION_EXPIRED',
        'FORBIDDEN',
        'RESOURCE_NOT_FOUND',
        'BUSINESS_RULE_VIOLATION',
        'CONCURRENT_MODIFICATION',
    )
    async cancel(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('viewingId') viewingId: string,
        @Body() request: ViewingNoteRequest,
    ): Promise<ViewingResponse> {
        return toViewingResponse(
            await this.viewingService.decide(principal, viewingId, {
                transition: 'cancel',
                note: request.note ? request.note : null,
            }),
        );
    }
}
