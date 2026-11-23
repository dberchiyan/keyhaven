import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { UuidParam } from '@/common/dto/uuid-param';
import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt, Idempotent } from '@/common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { Authorize } from '@/common/security/security.decorators';

import { ListingPhotoService } from '../service/listing-photo.service';
import { ManagedListingResponse } from './dto/listing.response';
import { PhotoIntentRequest, ReorderPhotosRequest } from './dto/listing-photo.request';
import { PhotoIntentResponse } from './dto/listing-photo.response';
import { toManagedListingResponse } from './mapper/listing.mapper';

/** A managed listing's photos: the upload in two steps (intent, confirmation), the order, removal. */
@ApiTags('Managed listings')
@Controller('api/v1/managed-listings')
export class ManagedListingPhotoController {
    constructor(private readonly photoService: ListingPhotoService) {}

    @Post(':listingId/photo-intents')
    @Authorize(can.editListing)
    @Idempotent()
    @ApiOperation({
        summary: 'Start a photo upload: answers a pre-signed URL the browser PUTs the file to',
        operationId: 'createPhotoIntent',
    })
    @ZodResponse({ status: HttpStatus.OK, type: PhotoIntentResponse })
    @ApiErrors('CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION', 'UPSTREAM_UNAVAILABLE')
    async createPhotoIntent(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
        @Body() request: PhotoIntentRequest,
    ): Promise<PhotoIntentResponse> {
        const intent = await this.photoService.createPhotoIntent(
            listingId,
            { filename: request.filename, contentType: request.contentType, sizeBytes: request.sizeBytes },
            principal.userId,
        );
        return {
            photoId: intent.photoId,
            uploadUrl: intent.uploadUrl,
            headers: intent.headers,
            expiresAt: intent.expiresAt.toISOString(),
        };
    }

    @Post(':listingId/photos/:photoId/confirmation')
    @Authorize(can.managePhoto)
    @IdempotencyExempt('Confirming a ready photo again changes nothing')
    @ApiOperation({
        summary: 'Finish a photo upload: the object is checked and the photo shown last',
        operationId: 'confirmPhoto',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    @ApiErrors('VALIDATION_FAILED', 'CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION', 'UPSTREAM_UNAVAILABLE')
    async confirmPhoto(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
        @UuidParam('photoId') photoId: string,
    ): Promise<ManagedListingResponse> {
        return toManagedListingResponse(await this.photoService.confirmPhoto(listingId, photoId, principal.userId));
    }

    @Put(':listingId/photos')
    @Authorize(can.editListing)
    @ApiOperation({
        summary: 'Reorder the photos: the complete new order of the ready ones',
        operationId: 'reorderPhotos',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ManagedListingResponse })
    @ApiErrors('CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION')
    async reorderPhotos(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
        @Body() request: ReorderPhotosRequest,
    ): Promise<ManagedListingResponse> {
        return toManagedListingResponse(
            await this.photoService.reorderPhotos(listingId, request.photoIds, principal.userId),
        );
    }

    @Delete(':listingId/photos/:photoId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Authorize(can.managePhoto)
    @ApiOperation({ summary: 'Remove a photo', operationId: 'removePhoto' })
    @ApiErrors('VALIDATION_FAILED', 'CONCURRENT_MODIFICATION', 'BUSINESS_RULE_VIOLATION', 'UPSTREAM_UNAVAILABLE')
    async removePhoto(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('listingId') listingId: string,
        @UuidParam('photoId') photoId: string,
    ): Promise<void> {
        await this.photoService.removePhoto(listingId, photoId, principal.userId);
    }
}
