import { Injectable } from '@nestjs/common';

import { type Cursor, type CursorPage, toCursorPage } from '@/common/dto/cursor';
import { ResourceNotFoundException } from '@/common/exception/api.exception';
import type { Actor } from '@/common/security/actor';
import { ObjectStorage } from '@/modules/storage/service/object-storage';
import { isViewingStatus, ViewingStatus } from '@/modules/viewing/service/viewing-status';

import { type InboxRow, MessageRepository } from '../repository/message.repository';
import type { SupportConversationRecord, ViewingConversationRecord } from '../repository/record/message.record';
import { inboxScopeOf, type LoadedConversation, readAtOf, sideOf, toMessage } from './conversation-access';
import type {
    Conversation,
    ConversationDetail,
    ConversationListing,
    ConversationSummary,
    Counterpart,
} from './message.types';
import { ConversationKind, CounterpartKind, isMessageSide, MessageSide, otherSide } from './message-side';

const KEYHAVEN_NAME = 'Keyhaven';

const SUPPORT_KINDS: Readonly<Record<string, CounterpartKind>> = {
    TENANT: CounterpartKind.TENANT,
    LANDLORD: CounterpartKind.LANDLORD,
    AGENT: CounterpartKind.AGENT,
};

type ConversationBase = Pick<Conversation, 'side' | 'lastMessage' | 'messageCount' | 'unread' | 'readAt' | 'seenAt'>;

const viewingCounterpart = (record: ViewingConversationRecord, side: MessageSide): Counterpart => {
    if (side === MessageSide.RESPONDER) {
        return { name: `${record.tenant.firstName} ${record.tenant.lastName}`, kind: CounterpartKind.TENANT };
    }
    const { landlord, agency } = record.listing;
    return landlord
        ? { name: `${landlord.firstName} ${landlord.lastName}`, kind: CounterpartKind.LANDLORD }
        : { name: agency?.name ?? '', kind: CounterpartKind.AGENCY };
};

/** Only an admin's `role` is staff; everyone else writes to Keyhaven as a member. */
const supportCounterpart = (record: SupportConversationRecord, side: MessageSide): Counterpart => {
    if (side === MessageSide.REQUESTER) {
        return { name: KEYHAVEN_NAME, kind: CounterpartKind.KEYHAVEN };
    }
    const opener = record.openedBy;
    return {
        name: opener ? `${opener.firstName} ${opener.lastName}` : '',
        kind: SUPPORT_KINDS[opener?.role ?? ''] ?? CounterpartKind.TENANT,
    };
};

const loadedOf = (
    row: InboxRow,
    viewingById: ReadonlyMap<string, ViewingConversationRecord>,
    supportById: ReadonlyMap<string, SupportConversationRecord>,
): LoadedConversation | undefined => {
    const viewing = row.kind === ConversationKind.VIEWING ? viewingById.get(row.id) : undefined;
    if (viewing) {
        return { kind: ConversationKind.VIEWING, record: viewing };
    }
    const support = row.kind === ConversationKind.SUPPORT ? supportById.get(row.id) : undefined;
    return support ? { kind: ConversationKind.SUPPORT, record: support } : undefined;
};

/**
 * Reading conversations: the inbox, one thread, the unread badge — each as the caller's side sees it.
 * A viewing's conversation keeps the viewing's id, so both kinds load by one id.
 */
@Injectable()
export class ConversationQueryService {
    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly storage: ObjectStorage,
    ) {}

    /**
     * The caller's inbox, newest activity first by cursor (API-23): one ranking statement, then a load per kind of
     * the page's ids (DATA-3).
     */
    async list(after: Cursor | undefined, size: number, actor: Actor): Promise<CursorPage<Conversation>> {
        const page = toCursorPage(await this.messageRepository.findInbox(inboxScopeOf(actor), after, size), size);
        const ranked = page.content;
        const idsOf = (kind: ConversationKind): string[] =>
            ranked.filter((row) => row.kind === kind).map((row) => row.id);
        const [viewings, supports] = await Promise.all([
            this.messageRepository.findViewingConversations(idsOf(ConversationKind.VIEWING)),
            this.messageRepository.findSupportConversations(idsOf(ConversationKind.SUPPORT)),
        ]);
        const viewingById = new Map(viewings.map((record) => [record.id, record]));
        const supportById = new Map(supports.map((record) => [record.id, record]));
        return {
            content: ranked.flatMap((row) => {
                const loaded = loadedOf(row, viewingById, supportById);
                return loaded ? [this.toConversation(loaded, row.unread, actor)] : [];
            }),
            nextCursor: page.nextCursor,
        };
    }

    /** One conversation with its whole thread (the policy checked the caller may read it). */
    async find(conversationId: string, actor: Actor): Promise<ConversationDetail> {
        const loaded = await this.load(conversationId);
        const side = sideOf(loaded, actor);
        const [messages, unread] = await Promise.all([
            this.messageRepository.findMessages(conversationId),
            this.messageRepository.countSince(conversationId, otherSide(side), readAtOf(loaded, side)),
        ]);
        return { ...this.toConversation(loaded, unread, actor), messages: messages.map(toMessage) };
    }

    async summary(actor: Actor): Promise<ConversationSummary> {
        const unread = await this.messageRepository.countUnreadInScope(inboxScopeOf(actor));
        return { unread };
    }

    async load(conversationId: string): Promise<LoadedConversation> {
        const viewing = await this.messageRepository.findViewingConversation(conversationId);
        if (viewing) {
            return { kind: ConversationKind.VIEWING, record: viewing };
        }
        const support = await this.messageRepository.findSupportConversation(conversationId);
        if (support) {
            return { kind: ConversationKind.SUPPORT, record: support };
        }
        throw new ResourceNotFoundException();
    }

    toConversation(loaded: LoadedConversation, unread: number, actor: Actor): Conversation {
        const side = sideOf(loaded, actor);
        const thread = loaded.kind === ConversationKind.VIEWING ? loaded.record.conversation : loaded.record;
        const last = thread?.messages[0];
        const base: ConversationBase = {
            side,
            lastMessage:
                last && isMessageSide(last.side)
                    ? { body: last.body, isRemoved: last.isRemoved, side: last.side, createdAt: last.createdAt }
                    : null,
            messageCount: thread?.messageCount ?? 0,
            unread,
            readAt: readAtOf(loaded, side),
            seenAt: readAtOf(loaded, otherSide(side)),
        };
        return loaded.kind === ConversationKind.VIEWING
            ? this.viewingConversation(loaded.record, base)
            : this.supportConversation(loaded.record, base);
    }

    /** The tenant's side learns the address with the confirmation; the owner's always has it. */
    private viewingConversation(record: ViewingConversationRecord, base: ConversationBase): Conversation {
        const status = isViewingStatus(record.status) ? record.status : ViewingStatus.EXPIRED;
        const isConfirmed = status === ViewingStatus.CONFIRMED;
        return {
            ...base,
            id: record.id,
            kind: ConversationKind.VIEWING,
            isOpen: isConfirmed,
            viewing: { id: record.id, status, startsAt: record.startsAt, endsAt: record.endsAt },
            support: null,
            listing: this.toListing(record.listing, base.side === MessageSide.RESPONDER || isConfirmed),
            counterpart: viewingCounterpart(record, base.side),
        };
    }

    private supportConversation(record: SupportConversationRecord, base: ConversationBase): Conversation {
        return {
            ...base,
            id: record.id,
            kind: ConversationKind.SUPPORT,
            isOpen: record.closedAt === null,
            viewing: null,
            support: { subject: record.subject ?? '', openedAt: record.createdAt, closedAt: record.closedAt },
            listing: record.listing ? this.toListing(record.listing, false) : null,
            counterpart: supportCounterpart(record, base.side),
        };
    }

    private toListing(listing: ViewingConversationRecord['listing'], withAddress: boolean): ConversationListing {
        const cover = listing.photos[0];
        const coverStorageUrl = cover?.storageKey ? this.storage.publicUrl(cover.storageKey) : null;
        return {
            id: listing.id,
            title: listing.title,
            coverPhotoUrl: cover ? (cover.url ?? coverStorageUrl) : null,
            neighborhood: listing.neighborhood,
            city: listing.city,
            address: withAddress ? { line1: listing.addressLine1, line2: listing.addressLine2 } : null,
        };
    }
}
