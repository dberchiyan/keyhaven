/**
 * Facts about the site itself: name, routes into the app (same origin — nginx serves the app at
 * every path but a signed-out `/`), demo accounts. Every claim on the page follows CONTEXT.md.
 */
export const SITE = {
    name: 'Keyhaven',
    title: 'Keyhaven · Homes to rent and buy in six US cities',
    /** Meta description (≤ 155 characters). */
    description:
        'Homes to rent and buy in Austin, Denver, Seattle, Chicago, Atlanta and Phoenix. Browse without an account, save searches, book viewings. Fictional homes.',
    locale: 'en',
    ogLocale: 'en_US',
    themeColor: { light: '#f5f1ea', dark: '#1a211d' },
    links: {
        browse: '/browse',
        rent: '/browse?kind=rent',
        buy: '/browse?kind=sale',
        houses: '/browse?type=HOUSE',
        signIn: '/login',
        signUp: '/signup?role=landlord',
        signUpTenant: '/signup',
        github: 'https://github.com/dberchiyan/keyhaven',
        readme: 'https://github.com/dberchiyan/keyhaven#readme',
        issues: 'https://github.com/dberchiyan/keyhaven/issues',
    },
} as const;

/** The six cities the demo serves; `slug` is the app's `?city=` value. */
export const CITIES = [
    { slug: 'austin', name: 'Austin', state: 'TX' },
    { slug: 'denver', name: 'Denver', state: 'CO' },
    { slug: 'seattle', name: 'Seattle', state: 'WA' },
    { slug: 'chicago', name: 'Chicago', state: 'IL' },
    { slug: 'atlanta', name: 'Atlanta', state: 'GA' },
    { slug: 'phoenix', name: 'Phoenix', state: 'AZ' },
] as const;

/**
 * The public demo's shared accounts (README → Demo accounts), one per role — the Demo section is
 * also where the page says what each role can do. Every person and home is fictional.
 */
export const DEMO = {
    password: 'Keyhaven-Demo-2026!',
    accounts: [
        {
            role: 'Tenant',
            name: 'Maya Lopez',
            email: 'maya.lopez@keyhaven.example',
            summary: 'Looking for a home.',
            items: ['Saved homes and searches', 'A daily email with new matches', 'Viewings'],
        },
        {
            role: 'Landlord',
            name: 'Daniel Reyes',
            email: 'daniel.reyes@keyhaven.example',
            summary: 'Lists their own homes.',
            items: [
                'Create and edit listings',
                'Upload and reorder photos',
                'Views and saves per home',
                'Viewing hours and requests',
            ],
        },
        {
            role: 'Agent · Harborline Realty',
            name: 'Priya Nair',
            email: 'priya.nair@harborline.example',
            summary: "Manages the agency's listings.",
            items: ['The same dashboard as a landlord', 'Shared with the other agents', 'Publish and unpublish'],
        },
        {
            role: 'Admin',
            name: 'Alex Morgan',
            email: 'alex.morgan@keyhaven.example',
            summary: 'Keeps the site clean.',
            items: ['Every listing on Keyhaven', 'Can suspend a listing', 'Cannot publish for an owner'],
        },
    ],
} as const;

export type DemoAccount = (typeof DEMO.accounts)[number];
