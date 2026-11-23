import { Controller, Delete, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { ApiPageable, type Pageable, PageableQuery } from '@/common/dto/pageable';
import { UuidParam } from '@/common/dto/uuid-param';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { Authorize } from '@/common/security/security.decorators';

import { SAVED_LISTING_PAGEABLE, type SavedListingSortField } from '../service/listing-sort';
import { SavedListingService } from '../service/saved-listing.service';
import { ListingPageResponse, SavedListingResponse } from './dto/listing.response';
import { toListingPageResponse } from './mapper/listing.mapper';

/** A tenant's saved homes. */
@ApiTags('Saved listings')
@Controller('api/v1/saved-listings')
export class SavedListingController {
    constructor(private readonly savedListingService: SavedListingService) {}

    @Get()
    @Authorize(can.viewSavedListings)
    @ApiOperation({
        summary: "The caller's saved homes that are still on the site, newest save first",
        operationId: 'listSavedListings',
    })
    @ApiPageable(SAVED_LISTING_PAGEABLE)
    @ZodResponse({ status: HttpStatus.OK, type: ListingPageResponse })
    async findPage(
        @CurrentPrincipal() principal: Principal,
        @PageableQuery(SAVED_LISTING_PAGEABLE) pageable: Pageable<SavedListingSortField>,
    ): Promise<ListingPageResponse> {
        return toListingPageResponse(await this.savedListingService.findPage(principal.userId, pageable));
    }

    @Put(':listingId')
    @Authorize(can.saveListing)
    @ApiOperation({ summary: 'Save a published home (saving it again changes nothing)', operationId: 'saveListing' })
    @ZodResponse({ status: HttpStatus.OK, type: SavedListingResponse })
    async save(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
    ): Promise<SavedListingResponse> {
        await this.savedListingService.save(principal.userId, listingId);
        return { listingId, isSaved: true };
    }

    @Delete(':listingId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.unsaveListing)
    @ApiOperation({ summary: 'Remove a home from the saved ones', operationId: 'unsaveListing' })
    async remove(@CurrentPrincipal() principal: Principal, @UuidParam('listingId') listingId: string): Promise<void> {
        await this.savedListingService.remove(principal.userId, listingId);
    }
}
