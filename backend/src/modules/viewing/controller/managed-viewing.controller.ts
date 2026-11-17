import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApiPageable, type Pageable, PageableQuery } from '../../../common/dto/pageable';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import { ViewingScheduleService } from '../service/viewing-schedule.service';
import { VIEWING_PAGEABLE, type ViewingSortField } from '../service/viewing-sort';
import { ViewingService } from '../service/viewing.service';
import type { ViewingCriteria } from '../service/viewing.types';
import { SaveViewingScheduleRequest } from './dto/viewing-schedule.request';
import { ManagedViewingFilterQuery } from './dto/viewing.query';
import {
    ViewingListResponse,
    ViewingPageResponse,
    ViewingScheduleResponse,
    ViewingScheduleStateResponse,
    ViewingSummaryResponse,
} from './dto/viewing.response';
import { toViewingResponse, toViewingScheduleResponse } from './mapper/viewing.mapper';

/** The query's fields, one by one, into the service's criteria (never passed on as is). */
const toCriteria = (query: ManagedViewingFilterQuery): ViewingCriteria => ({
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.listingId === undefined ? {} : { listingId: query.listingId }),
    ...(query.upcoming === undefined ? {} : { upcoming: query.upcoming }),
});

/** The owner's side: the viewings of their homes and each home's viewing hours. */
@ApiTags('Viewings')
@Controller('api/v1')
export class ManagedViewingController {
    constructor(
        private readonly viewingService: ViewingService,
        private readonly scheduleService: ViewingScheduleService,
    ) {}

    @Get('managed-viewings')
    @Authorize(can.manageViewings)
    @ApiOperation({
        summary:
            "Viewings of the caller's homes (landlords), the agency's (agents) or all (admins): by status, home, ahead only",
    })
    @ApiPageable(VIEWING_PAGEABLE)
    @ZodResponse({ status: HttpStatus.OK, type: ViewingPageResponse })
    @ApiErrors('VALIDATION_FAILED', 'INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
    async page(
        @CurrentPrincipal() principal: Principal,
        @Query() query: ManagedViewingFilterQuery,
        @PageableQuery(VIEWING_PAGEABLE) pageable: Pageable<ViewingSortField>,
    ): Promise<ViewingPageResponse> {
        const page = await this.viewingService.managedPage(principal, toCriteria(query), pageable);
        return { content: page.content.map(toViewingResponse), totalElements: page.totalElements };
    }

    @Get('managed-viewings/summary')
    @Authorize(can.manageViewings)
    @ApiOperation({
        summary: 'Requests waiting for an answer and confirmed viewings ahead (the badge)',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingSummaryResponse })
    @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
    summary(@CurrentPrincipal() principal: Principal): Promise<ViewingSummaryResponse> {
        return this.viewingService.summary(principal);
    }

    @Get('managed-listings/:listingId/viewings')
    @Authorize(can.manageListing)
    @ApiOperation({ summary: "One home's live viewings ahead, soonest first (at most 50)" })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingListResponse })
    @ApiErrors('INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN', 'RESOURCE_NOT_FOUND')
    async listForListing(@UuidParam('listingId') listingId: string): Promise<ViewingListResponse> {
        return {
            content: (await this.viewingService.listForListing(listingId)).map(toViewingResponse),
        };
    }

    @Get('managed-listings/:listingId/viewing-schedule')
    @Authorize(can.manageListing)
    @ApiOperation({ summary: "The home's viewing hours, or none yet, with the city's time zone" })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingScheduleStateResponse })
    @ApiErrors('INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN', 'RESOURCE_NOT_FOUND')
    async schedule(@UuidParam('listingId') listingId: string): Promise<ViewingScheduleStateResponse> {
        const state = await this.scheduleService.find(listingId);
        return {
            schedule: state.schedule ? toViewingScheduleResponse(state.schedule) : null,
            timeZone: state.timeZone,
        };
    }

    @Put('managed-listings/:listingId/viewing-schedule')
    @Authorize(can.editListing)
    @ApiOperation({
        summary:
            'Set or replace the viewing hours (the owner, verified email): slot length, notice, horizon, weekly windows, days off',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingScheduleResponse })
    @ApiErrors(
        'VALIDATION_FAILED',
        'INVALID_PARAMETER',
        'UNAUTHORIZED',
        'SESSION_EXPIRED',
        'FORBIDDEN',
        'EMAIL_NOT_VERIFIED',
        'DEMO_READ_ONLY',
        'RESOURCE_NOT_FOUND',
        'CONCURRENT_MODIFICATION',
    )
    async saveSchedule(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
        @Body() request: SaveViewingScheduleRequest,
    ): Promise<ViewingScheduleResponse> {
        return toViewingScheduleResponse(
            await this.scheduleService.save(principal, listingId, {
                slotMinutes: request.slotMinutes,
                noticeHours: request.noticeHours,
                horizonDays: request.horizonDays,
                windows: request.windows.map((window) => ({
                    weekday: window.weekday,
                    start: window.start,
                    end: window.end,
                })),
                blockedDays: [...request.blockedDays],
                version: request.version,
            }),
        );
    }

    @Delete('managed-listings/:listingId/viewing-schedule')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.editListing)
    @ApiOperation({
        summary: 'Close the viewing hours: nothing more can be booked; existing viewings stay',
    })
    @ApiErrors(
        'INVALID_PARAMETER',
        'UNAUTHORIZED',
        'SESSION_EXPIRED',
        'FORBIDDEN',
        'EMAIL_NOT_VERIFIED',
        'DEMO_READ_ONLY',
        'RESOURCE_NOT_FOUND',
    )
    async removeSchedule(@UuidParam('listingId') listingId: string): Promise<void> {
        await this.scheduleService.remove(listingId);
    }
}
