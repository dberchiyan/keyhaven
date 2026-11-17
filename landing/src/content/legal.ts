import { SITE } from './site';

/**
 * The privacy notice, the terms and the 404 page — every word, typed, like landing.ts. What the
 * privacy page lists is what the code stores (CONTEXT.md, backend migrations): keep the two in
 * step when a feature starts keeping something new.
 */
export interface LegalSection {
    /** Anchor and `aria-labelledby` target. */
    id: string;
    title: string;
    paragraphs?: readonly string[];
    items?: readonly string[];
    /** A link after the text (external links open in a new tab). */
    link?: { href: string; label: string };
}

export interface LegalPage {
    /** `<title>`, ≤ 60 characters. */
    metaTitle: string;
    /** Meta description, ≤ 155 characters. */
    description: string;
    heading: string;
    /** "Last updated" date, ISO (shown in en-US). */
    updated: string;
    updatedLabel: string;
    lead: string;
    sections: readonly LegalSection[];
}

export interface NotFoundPage {
    metaTitle: string;
    description: string;
    eyebrow: string;
    heading: string;
    lead: string;
    links: readonly { href: string; label: string; primary: boolean }[];
}

export const PRIVACY: LegalPage = {
    metaTitle: 'Privacy · Keyhaven',
    description:
        'What the Keyhaven demo stores: your account, sessions, a security log and what you create. No analytics, no tracking cookies; reset every night.',
    heading: 'Privacy',
    updated: '2026-11-17',
    updatedLabel: 'Last updated',
    lead: 'Keyhaven is a public portfolio demo with fictional homes and people. It keeps only what it needs to work, shows no ads, runs no analytics and sets no tracking cookies. Please do not enter real personal information.',
    sections: [
        {
            id: 'what-we-store',
            title: 'What the demo stores',
            items: [
                'Your account, if you create one: name, email address, role, and the password as an Argon2 hash (never in clear). Links for email verification and password reset are stored as hashes too.',
                'Sessions: a random token in an HttpOnly cookie, kept on the server as a hash, with the IP address and browser it signed in from and when it was last used. You see and end them under Settings → Sessions.',
                'A security log of sign-ins, failed sign-ins, password changes and ended sessions, with the IP address and browser. You see it under Settings.',
                'What you create: listings and the photos you upload, saved homes and saved searches, viewing hours and viewing requests with their notes, and messages in a conversation.',
                'Views of a listing: one per person per day — a signed-in person by their account, a visitor by a daily hash of their IP address and browser, never stored in clear. Owners see only the counts.',
            ],
        },
        {
            id: 'cookies',
            title: 'Cookies and browser storage',
            paragraphs: [
                'Two cookies, both needed for the app to work and set only when you use it: the session cookie (HttpOnly, sent only to this site) and XSRF-TOKEN, which protects your forms against requests from other sites. There are no analytics, advertising or third-party cookies.',
                'Your browser also keeps, on your device only, the homes you opened while signed out ("Recently viewed") and whether the dashboard sidebar is collapsed. Clearing the site data removes them.',
            ],
        },
        {
            id: 'email',
            title: 'Email',
            paragraphs: [
                'The demo sends no real email. Verification links, password resets, viewing notices and the daily saved-search digest are written to the server log instead of being delivered.',
            ],
        },
        {
            id: 'third-parties',
            title: 'Who else is involved',
            items: [
                'Cloudflare carries the site’s traffic and its encryption (TLS), so it sees requests as they pass.',
                'Listing photos in the app are loaded from Unsplash’s image service, which receives your IP address as with any image request. The pictures on this page are served by Keyhaven itself.',
                'Nothing is sold or shared with anyone else.',
            ],
        },
        {
            id: 'retention',
            title: 'How long it is kept',
            paragraphs: [
                'Every night at 00:00 Kyiv time the demo database and the photo store are wiped and seeded afresh: accounts you created, sessions, security logs, listings, photos, saved items, viewings and messages are all deleted. Server logs are not part of that reset; they are used only to run and debug the demo.',
            ],
        },
        {
            id: 'contact',
            title: 'Questions',
            paragraphs: [
                'Open an issue on GitHub. Because everything resets nightly, there is nothing left to ask us to delete after midnight Kyiv time.',
            ],
            link: { href: SITE.links.issues, label: 'Keyhaven issues on GitHub' },
        },
    ],
};

export const TERMS: LegalPage = {
    metaTitle: 'Terms of use · Keyhaven',
    description:
        'Keyhaven is a portfolio demo with fictional homes: no real rentals, sales or viewings. Use it to try the product, and expect it to reset every night.',
    heading: 'Terms of use',
    updated: '2026-11-17',
    updatedLabel: 'Last updated',
    lead: 'Keyhaven is a public demo of a rental and sales marketplace, built as a portfolio project. By using it you accept these terms.',
    sections: [
        {
            id: 'not-a-real-service',
            title: 'Not a real marketplace',
            paragraphs: [
                'Every home, landlord, agency, agent and renter on the demo is fictional. Nothing on Keyhaven is an offer to rent or sell a real property, a viewing booked here does not take place, and no money changes hands.',
            ],
        },
        {
            id: 'your-content',
            title: 'What you add',
            items: [
                'Use made-up details. Do not enter real personal information about yourself or anyone else.',
                'Upload only photos you have the right to share, and nothing unlawful, offensive or private.',
                'Anything you add can be seen by other visitors of the demo and is deleted at the nightly reset (00:00 Kyiv time).',
                'The shared demo accounts are for everyone: their seeded listings are read-only, and they cannot change their password or end sessions.',
            ],
        },
        {
            id: 'fair-use',
            title: 'Fair use',
            paragraphs: [
                'Do not attack, overload or scrape the service, or try to reach other people’s data. Requests are rate-limited, and abuse may be blocked. Found a security problem? Please report it through GitHub.',
            ],
        },
        {
            id: 'no-warranty',
            title: 'No warranty',
            paragraphs: [
                'The demo is provided as is, free of charge, without any warranty. It may be changed, reset or taken offline at any time, and data you add will not be kept.',
            ],
        },
        {
            id: 'source',
            title: 'The source',
            paragraphs: ['The code of Keyhaven is public on GitHub. Questions go there too.'],
            link: { href: SITE.links.github, label: 'Keyhaven on GitHub' },
        },
    ],
};

export const NOT_FOUND: NotFoundPage = {
    metaTitle: 'Page not found · Keyhaven',
    description:
        'This page does not exist on Keyhaven. Browse homes for rent and for sale, or go back to the home page.',
    eyebrow: '404',
    heading: 'This page is not here',
    lead: 'The link may be old or mistyped. The homes are still where they were.',
    links: [
        { href: SITE.links.browse, label: 'Browse homes', primary: true },
        { href: '/', label: 'Back to the home page', primary: false },
    ],
};
