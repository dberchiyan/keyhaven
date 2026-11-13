import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { Idempotent, IdempotencyExempt } from '../../../common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import { SavedSearchService } from '../service/saved-search.service';
import { CreateSavedSearchRequest, UpdateSavedSearchRequest } from './dto/saved-search.request';
import {
  DigestSummaryResponse,
  SavedSearchListResponse,
  SavedSearchResponse,
} from './dto/saved-search.response';
import { toSavedSearchResponse } from './mapper/saved-search.mapper';

/** A tenant's saved searches; a daily email lists new matches. */
@ApiTags('Saved searches')
@Controller('api/v1')
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Get('saved-searches')
  @Authorize(can.manageSavedSearches)
  @ApiOperation({ summary: "The caller's saved searches, newest first (at most 20)" })
  @ZodResponse({ status: HttpStatus.OK, type: SavedSearchListResponse })
  @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
  async list(@CurrentPrincipal() principal: Principal): Promise<SavedSearchListResponse> {
    return {
      content: (await this.savedSearchService.list(principal.userId)).map(toSavedSearchResponse),
    };
  }

  @Post('saved-searches')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.manageSavedSearches)
  @Idempotent()
  @ApiOperation({
    summary: 'Save the current filters as a named search, with or without daily emails',
  })
  @ZodResponse({ status: HttpStatus.OK, type: SavedSearchResponse })
  @ApiErrors(
    'VALIDATION_FAILED',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'BUSINESS_RULE_VIOLATION',
    'IDEMPOTENCY_KEY_REUSED',
  )
  async create(
    @CurrentPrincipal() principal: Principal,
    @Body() request: CreateSavedSearchRequest,
  ): Promise<SavedSearchResponse> {
    return toSavedSearchResponse(
      await this.savedSearchService.create(principal.userId, {
        name: request.name,
        criteria: request.criteria,
        emailAlerts: request.emailAlerts,
      }),
    );
  }

  @Put('saved-searches/:savedSearchId')
  @Authorize(can.manageSavedSearch)
  @ApiOperation({ summary: 'Rename a saved search or switch its daily email on or off' })
  @ZodResponse({ status: HttpStatus.OK, type: SavedSearchResponse })
  @ApiErrors(
    'VALIDATION_FAILED',
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
    'CONCURRENT_MODIFICATION',
  )
  async update(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('savedSearchId') savedSearchId: string,
    @Body() request: UpdateSavedSearchRequest,
  ): Promise<SavedSearchResponse> {
    return toSavedSearchResponse(
      await this.savedSearchService.update(principal.userId, savedSearchId, {
        name: request.name,
        emailAlerts: request.emailAlerts,
        version: request.version,
      }),
    );
  }

  @Delete('saved-searches/:savedSearchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authorize(can.manageSavedSearch)
  @ApiOperation({ summary: 'Delete a saved search' })
  @ApiErrors('INVALID_PARAMETER', 'UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
  async remove(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('savedSearchId') savedSearchId: string,
  ): Promise<void> {
    await this.savedSearchService.remove(principal.userId, savedSearchId);
  }

  @Post('saved-search-digests')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.admin)
  @IdempotencyExempt('A repeat finds nothing new: each search is marked before its email goes out')
  @ApiOperation({
    summary: 'Send the daily saved-search digests now (admins); the scheduler does it at 08:00 UTC',
  })
  @ZodResponse({ status: HttpStatus.OK, type: DigestSummaryResponse })
  @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
  sendDigests(): Promise<DigestSummaryResponse> {
    return this.savedSearchService.sendDigests(new Date());
  }
}
