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
import { SendMessageRequest, StartConversationRequest } from './dto/message.request';
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

/** Conversations: a viewing's thread between tenant and owner, or a member's request to Keyhaven. */
@ApiTags('Messages')
@Controller('api/v1')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('conversations')
  @Authorize(can.viewConversations)
  @ApiOperation({
    summary:
      "The caller's inbox: a conversation per confirmed viewing (their own, their homes' or all for admins) and their requests to Keyhaven (all of them for admins), latest message first (at most 100)",
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

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.startConversation)
  @Idempotent()
  @ApiOperation({
    summary:
      'Write to Keyhaven (any member): a subject, the first message, optionally the home it is about; at most 5 requests open at once',
  })
  @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
  @ApiErrors(
    'VALIDATION_FAILED',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
    'BUSINESS_RULE_VIOLATION',
    'IDEMPOTENCY_KEY_REUSED',
  )
  async start(
    @CurrentPrincipal() principal: Principal,
    @Body() request: StartConversationRequest,
  ): Promise<ConversationDetailResponse> {
    return toConversationDetailResponse(
      await this.messageService.start(principal, {
        subject: request.subject,
        body: request.body,
        listingId: request.listingId ?? null,
      }),
    );
  }

  @Get('conversations/:conversationId/messages')
  @Authorize(can.viewConversation)
  @ApiOperation({
    summary:
      'One conversation with its whole thread: its two sides, or an admin (every viewing thread, every request)',
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
    @UuidParam('conversationId') conversationId: string,
  ): Promise<ConversationDetailResponse> {
    return toConversationDetailResponse(await this.messageService.find(principal, conversationId));
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.messageConversation)
  @Idempotent()
  @ApiOperation({
    summary:
      'Write to the other side: a confirmed viewing’s tenant or owner (the staff only reads those), or a request’s member or the staff; a cancelled viewing’s or a closed request’s conversation is read-only',
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
    @UuidParam('conversationId') conversationId: string,
    @Body() request: SendMessageRequest,
  ): Promise<MessageResponse> {
    return toMessageResponse(
      await this.messageService.send(principal, { conversationId, body: request.body }),
    );
  }

  @Post('conversations/:conversationId/message-reads')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.messageConversation)
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
    @UuidParam('conversationId') conversationId: string,
  ): Promise<ReadReceiptResponse> {
    const receipt = await this.messageService.markRead(principal, conversationId);
    return { readAt: receipt.readAt?.toISOString() ?? null };
  }

  @Post('conversations/:conversationId/closure')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.manageConversation)
  @IdempotencyExempt('Closing a closed request again changes nothing')
  @ApiOperation({ summary: 'Close a request to Keyhaven (the staff): read-only until reopened' })
  @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
    'BUSINESS_RULE_VIOLATION',
  )
  async close(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('conversationId') conversationId: string,
  ): Promise<ConversationDetailResponse> {
    return toConversationDetailResponse(
      await this.messageService.setClosed(principal, conversationId, true),
    );
  }

  @Post('conversations/:conversationId/reopening')
  @HttpCode(HttpStatus.OK)
  @Authorize(can.manageConversation)
  @IdempotencyExempt('Reopening an open request again changes nothing')
  @ApiOperation({ summary: 'Reopen a closed request to Keyhaven (the staff)' })
  @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
  @ApiErrors(
    'INVALID_PARAMETER',
    'UNAUTHORIZED',
    'SESSION_EXPIRED',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
    'BUSINESS_RULE_VIOLATION',
  )
  async reopen(
    @CurrentPrincipal() principal: Principal,
    @UuidParam('conversationId') conversationId: string,
  ): Promise<ConversationDetailResponse> {
    return toConversationDetailResponse(
      await this.messageService.setClosed(principal, conversationId, false),
    );
  }
}
