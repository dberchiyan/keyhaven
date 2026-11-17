import type { EmailMessage } from '../../email/service/email-sender';
import type { Viewing, ViewingAudience } from './viewing.types';

const escapeHtml = (value: string): string =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

/** "Tue, Nov 18, 5:30 PM CST" — in the home's own zone, so nobody converts. */
export const formatSlot = (instant: Date, timeZone: string): string =>
    new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    }).format(instant);

const place = (viewing: Viewing): string =>
    [viewing.listing.neighborhood, `${viewing.listing.city.name}, ${viewing.listing.city.state}`]
        .filter(Boolean)
        .join(' · ');

const tenantName = (viewing: Viewing): string =>
    viewing.tenant ? `${viewing.tenant.firstName} ${viewing.tenant.lastName}` : 'A tenant';

interface Recipient {
    email: string;
    firstName: string;
}

/**
 * One layout for every viewing email: a heading, the lines, a button. Every interpolated value
 * is escaped (security.md → Injection); the text body carries the same information.
 */
const viewingEmail = (
    to: string,
    subject: string,
    heading: string,
    greeting: string,
    lines: readonly string[],
    action: { label: string; url: string },
    footer: string,
): EmailMessage => ({
    to,
    subject,
    text: `${greeting}\n\n${heading}\n\n${lines.join('\n')}\n\n${action.label}: ${action.url}\n\n${footer}`,
    html: `<!doctype html><html lang="en"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1f2933">
<h1 style="font-size:20px">${escapeHtml(heading)}</h1>
<p>${escapeHtml(greeting)}</p>
${lines.map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`).join('\n')}
<p><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:10px 16px;background:#1F5F4A;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(action.label)}</a></p>
<p style="font-size:13px;color:#52606d">${escapeHtml(footer)}</p>
</body></html>`,
});

const when = (viewing: Viewing): string => formatSlot(viewing.startsAt, viewing.listing.city.timeZone);

/** To the owner (the landlord, or the agency's inbox): a new request to answer. */
export const viewingRequestedEmail = (owner: Recipient, viewing: Viewing, appUrl: string): EmailMessage =>
    viewingEmail(
        owner.email,
        `Viewing request: ${viewing.listing.title} — ${when(viewing)}`,
        'Someone wants to see your home',
        `Hi ${owner.firstName},`,
        [
            `${tenantName(viewing)} asked to view ${viewing.listing.title} (${place(viewing)}).`,
            `When: ${when(viewing)}`,
            ...(viewing.message ? [`Their note: “${viewing.message}”`] : []),
            'The slot is held for them until you answer. Confirm or decline in your dashboard.',
        ],
        { label: 'Answer the request', url: `${appUrl}/viewings` },
        'You get this email because your home has viewing hours on Keyhaven.',
    );

/** To the tenant: the owner said yes — with the exact address. */
export const viewingConfirmedEmail = (tenant: Recipient, viewing: Viewing, appUrl: string): EmailMessage =>
    viewingEmail(
        tenant.email,
        `Confirmed: ${viewing.listing.title} on ${when(viewing)}`,
        'Your viewing is confirmed',
        `Hi ${tenant.firstName},`,
        [
            `${viewing.listing.title} — ${place(viewing)}`,
            `When: ${when(viewing)}`,
            ...(viewing.listing.address
                ? [
                      `Address: ${[viewing.listing.address.line1, viewing.listing.address.line2].filter(Boolean).join(', ')}`,
                  ]
                : []),
            'Running late or can’t make it? Cancel from your viewings so the owner knows.',
        ],
        { label: 'See the viewing', url: `${appUrl}/viewings` },
        'You get this email because you asked for a viewing on Keyhaven.',
    );

/** To the tenant: the owner said no. */
export const viewingDeclinedEmail = (tenant: Recipient, viewing: Viewing, appUrl: string): EmailMessage =>
    viewingEmail(
        tenant.email,
        `Not available: ${viewing.listing.title} on ${when(viewing)}`,
        'The owner can’t do this time',
        `Hi ${tenant.firstName},`,
        [
            `${viewing.listing.title} — ${place(viewing)}`,
            `Requested: ${when(viewing)}`,
            ...(viewing.note ? [`Their note: “${viewing.note}”`] : []),
            'Pick another slot from the home’s page if the hours still suit you.',
        ],
        { label: 'Open the home', url: `${appUrl}/listings/${viewing.listing.id}` },
        'You get this email because you asked for a viewing on Keyhaven.',
    );

/** To the other side: a confirmed or requested viewing was called off. */
export const viewingCancelledEmail = (
    recipient: Recipient,
    audience: ViewingAudience,
    viewing: Viewing,
    appUrl: string,
): EmailMessage =>
    viewingEmail(
        recipient.email,
        `Cancelled: ${viewing.listing.title} on ${when(viewing)}`,
        audience === 'OWNER' ? 'A viewing was cancelled' : 'Your viewing was cancelled',
        `Hi ${recipient.firstName},`,
        [
            `${viewing.listing.title} — ${place(viewing)}`,
            `Was: ${when(viewing)}`,
            audience === 'OWNER'
                ? `${tenantName(viewing)} cancelled; the slot is open again.`
                : 'The owner cancelled; the slot is no longer held for you.',
            ...(viewing.note ? [`Their note: “${viewing.note}”`] : []),
        ],
        audience === 'OWNER'
            ? { label: 'Open the dashboard', url: `${appUrl}/viewings` }
            : { label: 'Pick another time', url: `${appUrl}/listings/${viewing.listing.id}` },
        'You get this email because of a viewing on Keyhaven.',
    );

/** The day before: both sides. */
export const viewingReminderEmail = (
    recipient: Recipient,
    audience: ViewingAudience,
    viewing: Viewing,
    appUrl: string,
): EmailMessage =>
    viewingEmail(
        recipient.email,
        `Tomorrow: ${viewing.listing.title} at ${when(viewing)}`,
        audience === 'OWNER' ? 'A viewing tomorrow' : 'Your viewing is tomorrow',
        `Hi ${recipient.firstName},`,
        [
            `${viewing.listing.title} — ${place(viewing)}`,
            `When: ${when(viewing)}`,
            ...(audience === 'OWNER'
                ? [`Who: ${tenantName(viewing)}${viewing.tenant?.phone ? ` · ${viewing.tenant.phone}` : ''}`]
                : viewing.listing.address
                  ? [
                        `Address: ${[viewing.listing.address.line1, viewing.listing.address.line2].filter(Boolean).join(', ')}`,
                    ]
                  : []),
            'If it no longer works, cancel so the other side knows in time.',
        ],
        { label: 'See the viewing', url: `${appUrl}/viewings` },
        'You get this email because of a confirmed viewing on Keyhaven.',
    );
