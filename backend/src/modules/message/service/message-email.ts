import type { EmailMessage } from '../../email/service/email-sender';
import { PREVIEW_LENGTH } from './message-limits';
import type { Conversation, Message } from './message.types';

const escapeHtml = (value: string): string =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

/** "Tue, Nov 18, 5:30 PM CST" — in the home's own zone. */
const formatSlot = (instant: Date, timeZone: string): string =>
    new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    }).format(instant);

/** The first line or so of a message, for a subject-length glimpse. */
export const excerptOf = (body: string): string => {
    const flat = body.replace(/\s+/g, ' ').trim();
    return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : flat;
};

export interface Recipient {
    email: string;
    firstName: string;
}

/** What the conversation is about, in a few words: the home and the viewing, or the request's subject. */
const topicOf = (conversation: Conversation): string =>
    conversation.viewing && conversation.listing
        ? `${conversation.listing.title} (viewing ${formatSlot(conversation.viewing.startsAt, conversation.listing.city.timeZone)})`
        : `your request “${conversation.support?.subject ?? ''}”`;

/**
 * To the other side: someone wrote in a conversation. Sent only when the recipient had nothing
 * unread there (one email per run of messages, not one per message). Every interpolated value
 * is escaped (security.md → Injection).
 */
export const newMessageEmail = (
    recipient: Recipient,
    conversation: Conversation,
    message: Message,
    appUrl: string,
): EmailMessage => {
    const heading = 'You have a new message';
    const greeting = `Hi ${recipient.firstName},`;
    const sender =
        conversation.kind === 'SUPPORT' && message.side === 'RESPONDER'
            ? 'Keyhaven'
            : `${message.sender.firstName} ${message.sender.lastName}`;
    const lines = [
        `${sender} wrote about ${topicOf(conversation)}:`,
        `“${excerptOf(message.body)}”`,
        'Answer in Keyhaven — replies to this email are not read.',
    ];
    const action = { label: 'Open the conversation', url: `${appUrl}/messages/${conversation.id}` };
    const footer =
        conversation.kind === 'SUPPORT'
            ? 'You get this email because you wrote to Keyhaven.'
            : 'You get this email because of a confirmed viewing on Keyhaven.';
    const subject =
        conversation.kind === 'SUPPORT'
            ? `Keyhaven answered: ${conversation.support?.subject ?? ''}`
            : `New message: ${conversation.listing?.title ?? ''}`;
    return {
        to: recipient.email,
        subject,
        text: `${greeting}\n\n${heading}\n\n${lines.join('\n')}\n\n${action.label}: ${action.url}\n\n${footer}`,
        html: `<!doctype html><html lang="en"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1f2933">
<h1 style="font-size:20px">${escapeHtml(heading)}</h1>
<p>${escapeHtml(greeting)}</p>
${lines.map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`).join('\n')}
<p><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:10px 16px;background:#1F5F4A;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(action.label)}</a></p>
<p style="font-size:13px;color:#52606d">${escapeHtml(footer)}</p>
</body></html>`,
    };
};
