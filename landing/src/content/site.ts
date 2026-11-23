export const CANONICAL_URL = 'https://keyhaven.dberchiyan.com';

export const SITE = {
    name: 'Keyhaven',
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
        privacy: '/privacy',
        terms: '/terms',
        github: 'https://github.com/dberchiyan/keyhaven',
        readme: 'https://github.com/dberchiyan/keyhaven#readme',
        issues: 'https://github.com/dberchiyan/keyhaven/issues',
    },
    sameAs: ['https://github.com/dberchiyan/keyhaven'],
} as const;

export const APP_ROUTE_PREFIXES = ['/browse', '/login', '/signup', '/listings/'] as const;

export const AI_CRAWLERS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-SearchBot',
    'Claude-User',
    'Google-Extended',
    'PerplexityBot',
    'CCBot',
    'Applebot-Extended',
] as const;

export const CITIES = [
    { slug: 'austin', name: 'Austin', state: 'TX' },
    { slug: 'denver', name: 'Denver', state: 'CO' },
    { slug: 'seattle', name: 'Seattle', state: 'WA' },
    { slug: 'chicago', name: 'Chicago', state: 'IL' },
    { slug: 'atlanta', name: 'Atlanta', state: 'GA' },
    { slug: 'phoenix', name: 'Phoenix', state: 'AZ' },
] as const;

export type City = (typeof CITIES)[number];

export type CitySlug = City['slug'];

export const DEMO = {
    password: 'Keyhaven-Demo-2026!',
    accounts: [
        {
            role: 'Tenant',
            name: 'Maya Lopez',
            firstName: 'Maya',
            email: 'maya.lopez@keyhaven.example',
            summary: 'Looking for a home.',
            items: ['Saved homes and searches', 'A daily email of new matches', 'Viewings and messages'],
        },
        {
            role: 'Landlord',
            name: 'Daniel Reyes',
            firstName: 'Daniel',
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
            firstName: 'Priya',
            email: 'priya.nair@harborline.example',
            summary: "Manages the agency's listings.",
            items: ['The landlord dashboard', 'Shared with the other agents', 'Publish and unpublish'],
        },
        {
            role: 'Admin',
            name: 'Alex Morgan',
            firstName: 'Alex',
            email: 'alex.morgan@keyhaven.example',
            summary: 'Keeps the site clean.',
            items: ['Every listing on Keyhaven', 'Can suspend a listing', 'Answers requests in Messages'],
        },
    ],
} as const;

export type DemoAccount = (typeof DEMO.accounts)[number];

/** The demo cards sign in with the address filled in: the app's login page reads `?email=`. */
export const demoSignInHref = (account: DemoAccount): string =>
    `${SITE.links.signIn}?email=${encodeURIComponent(account.email)}`;
