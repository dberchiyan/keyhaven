import type { EmailMessage } from '../../email/service/email-sender';
import type { ListingCard } from '../../listing/service/listing.types';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const dollars = (amount: string): string =>
  `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** "$1,850/mo" for a rental, "$425,000" for a home for sale. */
const priceOf = (listing: ListingCard): string =>
  listing.kind === 'RENT' ? `${dollars(listing.price.amount)}/mo` : dollars(listing.price.amount);

const rooms = (listing: ListingCard): string =>
  listing.bedrooms === 0
    ? `Studio · ${listing.bathrooms} bath`
    : `${listing.bedrooms} bed · ${listing.bathrooms} bath`;

/**
 * The daily digest of a saved search: the new matches, each linking to its page. Every
 * interpolated value is escaped (security.md → Injection).
 */
export const digestEmail = (
  to: string,
  firstName: string,
  searchName: string,
  listings: readonly ListingCard[],
  appUrl: string,
  total: number,
): EmailMessage => {
  const lines = listings.map(
    (listing) =>
      `• ${listing.title} — ${priceOf(listing)} · ${rooms(listing)} · ${listing.city.name}, ${listing.city.state}\n  ${appUrl}/listings/${listing.id}`,
  );
  const more = total > listings.length ? `\n…and ${total - listings.length} more.` : '';
  const items = listings
    .map(
      (listing) => `<li style="margin:0 0 12px">
<a href="${escapeHtml(`${appUrl}/listings/${listing.id}`)}" style="font-weight:600;color:#1F5F4A">${escapeHtml(listing.title)}</a><br>
<span style="color:#52606d">${escapeHtml(priceOf(listing))} · ${escapeHtml(rooms(listing))} · ${escapeHtml(`${listing.city.name}, ${listing.city.state}`)}</span></li>`,
    )
    .join('\n');
  const moreHtml =
    total > listings.length
      ? `<p>…and ${escapeHtml(String(total - listings.length))} more.</p>`
      : '';
  return {
    to,
    subject: `${listings.length} new ${listings.length === 1 ? 'home' : 'homes'} for "${searchName}" — Keyhaven`,
    text: `Hi ${firstName},\n\nNew homes match your saved search "${searchName}":\n\n${lines.join('\n')}${more}\n\nSee them all: ${appUrl}/browse\n\nYou get this email once a day while the search has alerts on. Turn them off in Saved → Searches.`,
    html: `<!doctype html><html lang="en"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1f2933">
<h1 style="font-size:20px">New homes for “${escapeHtml(searchName)}”</h1>
<p>Hi ${escapeHtml(firstName)},</p>
<ul style="padding-left:18px">${items}</ul>${moreHtml}
<p><a href="${escapeHtml(`${appUrl}/browse`)}" style="display:inline-block;padding:10px 16px;background:#1F5F4A;color:#fff;border-radius:8px;text-decoration:none">See all homes</a></p>
<p style="font-size:13px;color:#52606d">You get this email once a day while the search has alerts on. Turn them off in Saved → Searches.</p>
</body></html>`,
  };
};
