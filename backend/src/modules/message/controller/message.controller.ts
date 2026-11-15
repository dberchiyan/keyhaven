import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { UuidParam } from '../../../common/dto/uuid-param';
import { ApiErrors } from '../../../common/exception/api-errors.decorator';
import { Idempotent, IdempotencyExempt } from '../../../common/idempotency/idempotent.decorator';
import { CurrentPrincipal } from '../../../common/security/current-principal.decorator';
import { can } from '../../../common/security/policies';
import type { Principal } from '../../../common/security/principal';
import { Authorize } from '../../../common/security/security.decorators';
import { MessageService } from '../service/message.service';
import { SendMessageRequest } from './dto/message.request';
import {
  ConversationDetailResponse,
  ConversationListResponse,
  ConversationSummaryResponse,
  MessageResponse,
  ReadReceiptResponse,
} from './dto/message.response';
import {
  toConversationDetailResponse,
  toConversationResponse,
  toMessageResponse,
} from './mapper/message.mapper';

/** Messages between a tenant and the home's owner: one conversation per confirmed viewing. */
@ApiTags('Messages')
@Controller('api/v1')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('conversations')
  @Authorize(can.viewConversations)
  @ApiOperation({
    summary:
      "The caller's inbox: a conversation per confirmed viewing (their own, their homes' or all for admins), latest message first (at most 100)",
  })
  @ZodResponse({ status: HttpStatus.OK, type: ConversationListResponse })
  @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
  async list(@CurrentPrincipal() principal: Principal): Promise<ConversationListResponse> {
    return { content: (await this.messageService.list(principal)).map(toConversationResponse) };
  }

  @Get('conversations/summary')
  @Authorize(can.viewConversations)
  @ApiOperation({ summary: 'Unread messages over the whole inbox (the badge)' })
  @ZodResponse({ status: HttpStatus.OK, type: ConversationSummaryResponse })
  @ApiErrors('UNAUTHORIZED', 'SESSION_EXPIRED', 'FORBIDDEN')
  summary(@CurrentPrincipal() principal: Principal): Promise<ConversationSummaryResponse> {
    return this.messageService.summary(principal);
  }

  @Get('viewings/:viewingId/messages')
  @Authorize(can.viewViewing)
  @ApiOperation({
    summary: 'One conversation with its whole thread: its tenant, the home’s owner or an admin',
  })
  @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
  )
  async find(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('viewingId') viewingId: string,
  ): Promise<ConversationDetailResponse> {
    return toConversationDetailResponse(await this.messageService.find(principal, viewingId));
  }

  @Post('viewings/:viewingId/messages')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.messageViewing)
  @Idempotent()
  @ApiOperation({
    summary:
      'Write to the other side of a confirmed viewing (its tenant or the home’s owner); a cancelled viewing’s conversation is closed',
  })
  @ZodResponse({ status: HttpStatus.OK, type: MessageResponse })
  @ApiErrors(
    'VALIDATION_FAILED',
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
    'BUSINESS_RULE_VIOLATION',
    'IDEMPOTENCY_KEY_REUSED',
  )
  async send(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('viewingId') viewingId: string,
    @Body() request: SendMessageRequest,
  ): Promise<MessageResponse> {
    return toMessageResponse(
      await this.messageService.send(principal, { viewingId, body: request.body }),
    );
  }

  @Post('viewings/:viewingId/message-reads')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.messageViewing)
  @IdempotencyExempt('Reading a thread twice reads the same thread')
  @ApiOperation({ summary: 'The caller read the conversation: its unread messages are cleared' })
  @ZodResponse({ status: HttpStatus.OK, type: ReadReceiptResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
  )
  async markRead(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('viewingId') viewingId: string,
  ): Promise<ReadReceiptResponse> {
    const receipt = await this.messageService.markRead(principal, viewingId);
    return { readAt: receipt.readAt?.toISOString() ?? null };
  }
}
