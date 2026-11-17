import { Injectable } from '@nestjs/common';

import { MessagePrivacyRepository } from '../repository/message-privacy.repository';
import type { MessageDataExport } from './message.types';
import { MAX_EXPORTED_CONVERSATIONS, MAX_EXPORTED_MESSAGES } from './message-limits';

/**
 * DATA-23: what the message module holds about a person — the messages they wrote and the requests
 * they opened — for the privacy module's export and erasure (CORE-16: exported).
 */
@Injectable()
export class MessagePrivacyService {
    constructor(private readonly messagePrivacyRepository: MessagePrivacyRepository) {}

    /** API-22: bounded by MAX_EXPORTED_MESSAGES and MAX_EXPORTED_CONVERSATIONS, newest first. */
    async exportFor(userId: string): Promise<MessageDataExport> {
        const [written, opened] = await Promise.all([
            this.messagePrivacyRepository.findWrittenForExport(userId, MAX_EXPORTED_MESSAGES),
            this.messagePrivacyRepository.findOpenedForExport(userId, MAX_EXPORTED_CONVERSATIONS),
        ]);
        return {
            messagesWritten: written.map((row) => ({
                conversationId: row.conversationId,
                body: row.body,
                createdAt: row.createdAt,
            })),
            conversationsOpened: opened.map((row) => ({ subject: row.subject ?? '', createdAt: row.createdAt })),
        };
    }

    /**
     * Joins the erasing transaction: the person's messages read "removed" to the other side, no event or email —
     * the other side sees it on their next read. Not audited: chat is not an admin action (a project decision).
     */
    async erase(userId: string): Promise<void> {
        await this.messagePrivacyRepository.removeWrittenBy(userId);
    }
}
