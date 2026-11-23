import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { ApiPageable, type Pageable, PageableQuery } from '@/common/dto/pageable';
import { UuidParam } from '@/common/dto/uuid-param';
import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { toActor } from '@/common/security/actor';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { Authorize } from '@/common/security/security.decorators';

import type { ViewingCriteria } from '../service/viewing.types';
import { ViewingQueryService } from '../service/viewing-query.service';
import { ViewingScheduleService } from '../service/viewing-schedule.service';
import { VIEWING_PAGEABLE, type ViewingSortField } from '../service/viewing-sort';
import { ManagedViewingFilterQuery } from './dto/viewing.query';
import {
    ViewingListResponse,
    ViewingPageResponse,
    ViewingScheduleResponse,
    ViewingScheduleStateResponse,
    ViewingSummaryResponse,
} from './dto/viewing.response';
import { SaveViewingScheduleRequest } from './dto/viewing-schedule.request';
import { toViewingResponse, toViewingScheduleResponse } from './mapper/viewing.mapper';

/** CORE-20: the query's fields, one by one, into the service's criteria (never passed on as is). */
const toCriteria = (query: ManagedViewingFilterQuery): ViewingCriteria => ({
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.listingId === undefined ? {} : { listingId: query.listingId }),
    ...(query.isUpcoming === undefined ? {} : { isUpcoming: query.isUpcoming }),
});

/** The owner's side: the viewings of their homes and each home's viewing hours. */
@ApiTags('Viewings')
@Controller('api/v1')
export class ManagedViewingController {
    constructor(
        private readonly viewingQueryService: ViewingQueryService,
        private readonly scheduleService: ViewingScheduleService,
    ) {}

    @Get('managed-viewings')
    @Authorize(can.manageViewings)
    @ApiOperation({
        summary:
            "Viewings of the caller's homes (landlords), the agency's (agents) or all (admins): by status, home, ahead only",
        operationId: 'listManagedViewings',
    })
    @ApiPageable(VIEWING_PAGEABLE)
    @ZodResponse({ status: HttpStatus.OK, type: ViewingPageResponse })
    async page(
        @CurrentPrincipal() principal: Principal,
        @Query() query: ManagedViewingFilterQuery,
        @PageableQuery(VIEWING_PAGEABLE) pageable: Pageable<ViewingSortField>,
    ): Promise<ViewingPageResponse> {
        const page = await this.viewingQueryService.managedPage(toCriteria(query), pageable, toActor(principal));
        return { content: page.content.map(toViewingResponse), totalElements: page.totalElements };
    }

    @Get('managed-viewings/summary')
    @Authorize(can.manageViewings)
    @ApiOperation({
        summary: 'Requests waiting for an answer and confirmed viewings ahead (the badge)',
        operationId: 'findManagedViewingSummary',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingSummaryResponse })
    summary(@CurrentPrincipal() principal: Principal): Promise<ViewingSummaryResponse> {
        return this.viewingQueryService.summary(toActor(principal));
    }

    @Get('managed-listings/:listingId/viewings')
    @Authorize(can.manageListing)
    @ApiOperation({
        summary: "One home's live viewings ahead, soonest first (at most 50)",
        operationId: 'listListingViewings',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingListResponse })
    async listForListing(@UuidParam('listingId') listingId: string): Promise<ViewingListResponse> {
        return {
            content: (await this.viewingQueryService.listForListing(listingId)).map(toViewingResponse),
        };
    }

    @Get('managed-listings/:listingId/viewing-schedule')
    @Authorize(can.manageListing)
    @ApiOperation({
        summary: "The home's viewing hours, or none yet, with the city's time zone",
        operationId: 'findViewingSchedule',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingScheduleStateResponse })
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
        operationId: 'saveViewingSchedule',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ViewingScheduleResponse })
    @ApiErrors('DEMO_READ_ONLY', 'CONCURRENT_MODIFICATION')
    async saveSchedule(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
        @Body() request: SaveViewingScheduleRequest,
    ): Promise<ViewingScheduleResponse> {
        return toViewingScheduleResponse(
            await this.scheduleService.save(
                listingId,
                {
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
                },
                principal.userId,
            ),
        );
    }

    @Delete('managed-listings/:listingId/viewing-schedule')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.editListing)
    @ApiOperation({
        summary: 'Close the viewing hours: nothing more can be booked; existing viewings stay',
        operationId: 'removeViewingSchedule',
    })
    @ApiErrors('DEMO_READ_ONLY')
    async removeSchedule(@UuidParam('listingId') listingId: string): Promise<void> {
        await this.scheduleService.remove(listingId);
    }
}
