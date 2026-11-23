import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { encodeCursor } from '@/common/dto/cursor';
import { UuidParam } from '@/common/dto/uuid-param';
import { ApiErrors } from '@/common/exception/api-errors.decorator';
import { IdempotencyExempt, Idempotent } from '@/common/idempotency/idempotent.decorator';
import { toActor } from '@/common/security/actor';
import { CurrentPrincipal } from '@/common/security/current-principal.decorator';
import { can } from '@/common/security/policies';
import type { Principal } from '@/common/security/principal';
import { Authorize } from '@/common/security/security.decorators';

import { ConversationQueryService } from '../service/conversation-query.service';
import { MessageService } from '../service/message.service';
import { ConversationListQuery } from './dto/message.query';
import { SendMessageRequest, StartConversationRequest } from './dto/message.request';
import {
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationSummaryResponse,
    MessageResponse,
    ReadReceiptResponse,
} from './dto/message.response';
import { toConversationDetailResponse, toConversationResponse, toMessageResponse } from './mapper/message.mapper';

/** Conversations: a viewing's thread between tenant and owner, or a member's request to Keyhaven. */
@ApiTags('Messages')
@Controller('api/v1')
export class MessageController {
    constructor(
        private readonly messageService: MessageService,
        private readonly conversationQueryService: ConversationQueryService,
    ) {}

    @Get('conversations')
    @Authorize(can.viewConversations)
    @ApiOperation({
        summary:
            "The caller's inbox: a conversation per confirmed viewing (their own, their homes' or all for admins) and their requests to Keyhaven (all of them for admins), newest activity first by cursor (`after` from the previous page's `nextCursor`)",
        operationId: 'listConversations',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ConversationListResponse })
    @ApiErrors('FORBIDDEN')
    async list(
        @CurrentPrincipal() principal: Principal,
        @Query() query: ConversationListQuery,
    ): Promise<ConversationListResponse> {
        const page = await this.conversationQueryService.list(query.after, query.size, toActor(principal));
        return {
            content: page.content.map(toConversationResponse),
            nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
        };
    }

    @Get('conversations/summary')
    @Authorize(can.viewConversations)
    @ApiOperation({
        summary: 'Unread messages over the whole inbox (the badge)',
        operationId: 'findConversationSummary',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ConversationSummaryResponse })
    @ApiErrors('FORBIDDEN')
    summary(@CurrentPrincipal() principal: Principal): Promise<ConversationSummaryResponse> {
        return this.conversationQueryService.summary(toActor(principal));
    }

    @Post('conversations')
    @Authorize(can.startConversation)
    @Idempotent()
    @ApiOperation({
        summary:
            'Write to Keyhaven (any member): a subject, the first message, optionally the home it is about; at most 5 requests open at once',
        operationId: 'startConversation',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
    @ApiErrors('RESOURCE_NOT_FOUND', 'BUSINESS_RULE_VIOLATION')
    async start(
        @CurrentPrincipal() principal: Principal,
        @Body() request: StartConversationRequest,
    ): Promise<ConversationDetailResponse> {
        return toConversationDetailResponse(
            await this.messageService.start(
                { subject: request.subject, body: request.body, listingId: request.listingId ?? null },
                toActor(principal),
            ),
        );
    }

    @Get('conversations/:conversationId/messages')
    @Authorize(can.viewConversation)
    @ApiOperation({
        summary:
            'One conversation with its whole thread: its two sides, or an admin (every viewing thread, every request)',
        operationId: 'findConversation',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
    async find(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('conversationId') conversationId: string,
    ): Promise<ConversationDetailResponse> {
        return toConversationDetailResponse(
            await this.conversationQueryService.find(conversationId, toActor(principal)),
        );
    }

    @Post('conversations/:conversationId/messages')
    @Authorize(can.messageConversation)
    @Idempotent()
    @ApiOperation({
        summary:
            'Write to the other side: a confirmed viewing’s tenant or owner (the staff only reads those), or a request’s member or the staff; a cancelled viewing’s or a closed request’s conversation is read-only',
        operationId: 'sendMessage',
    })
    @ZodResponse({ status: HttpStatus.OK, type: MessageResponse })
    @ApiErrors('BUSINESS_RULE_VIOLATION')
    async send(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('conversationId') conversationId: string,
        @Body() request: SendMessageRequest,
    ): Promise<MessageResponse> {
        return toMessageResponse(
            await this.messageService.send({ conversationId, body: request.body }, toActor(principal)),
        );
    }

    @Post('conversations/:conversationId/message-reads')
    @Authorize(can.messageConversation)
    @IdempotencyExempt('Reading a thread twice reads the same thread')
    @ApiOperation({
        summary: 'The caller read the conversation: its unread messages are cleared',
        operationId: 'markConversationRead',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ReadReceiptResponse })
    async markRead(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('conversationId') conversationId: string,
    ): Promise<ReadReceiptResponse> {
        const receipt = await this.messageService.markRead(conversationId, toActor(principal));
        return { readAt: receipt.readAt?.toISOString() ?? null };
    }

    @Post('conversations/:conversationId/closure')
    @Authorize(can.manageConversation)
    @IdempotencyExempt('Closing a closed request again changes nothing')
    @ApiOperation({
        summary: 'Close a request to Keyhaven (the staff): read-only until reopened',
        operationId: 'closeConversation',
    })
    @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
    @ApiErrors('BUSINESS_RULE_VIOLATION')
    async close(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('conversationId') conversationId: string,
    ): Promise<ConversationDetailResponse> {
        return toConversationDetailResponse(
            await this.messageService.setClosed(conversationId, true, toActor(principal)),
        );
    }

    @Post('conversations/:conversationId/reopening')
    @Authorize(can.manageConversation)
    @IdempotencyExempt('Reopening an open request again changes nothing')
    @ApiOperation({ summary: 'Reopen a closed request to Keyhaven (the staff)', operationId: 'reopenConversation' })
    @ZodResponse({ status: HttpStatus.OK, type: ConversationDetailResponse })
    @ApiErrors('BUSINESS_RULE_VIOLATION')
    async reopen(
        @CurrentPrincipal() principal: Principal,
        @UuidParam('conversationId') conversationId: string,
    ): Promise<ConversationDetailResponse> {
        return toConversationDetailResponse(
            await this.messageService.setClosed(conversationId, false, toActor(principal)),
        );
    }
}
