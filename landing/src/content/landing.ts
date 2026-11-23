import type { LandingContent } from './landing-types';
import { SITE } from './site';

export const LANDING: LandingContent = {
    meta: {
        title: 'Keyhaven · Homes to rent and buy in 6 US cities',
        description:
            'Homes to rent and buy in Austin, Denver, Seattle, Chicago, Atlanta and Phoenix. Browse without an account, save searches, book viewings. Fictional homes.',
        updatedOn: '2026-11-23',
    },
    hero: {
        eyebrow: 'Rent or buy · 6 US cities',
        title: { start: 'Find a home', accent: 'you can picture living in.' },
        lead: 'Apartments, houses, condos and studios to rent or buy in Austin, Denver, Seattle, Chicago, Atlanta and Phoenix. Browse without an account. Sign up only to save homes or list one.',
        leadShort: 'Homes to rent or buy in 6 US cities. Browse without an account.',
        search: {
            legend: 'What are you looking for?',
            rent: 'Rent',
            buy: 'Buy',
            label: 'Where',
            placeholder: 'City, neighborhood or ZIP',
            submit: 'Browse homes',
        },
        hint: 'Typos are fine: "Walingford" still finds Wallingford.',
        citiesLabel: 'Browse by city',
    },
    proof: {
        label: 'The catalogue in figures',
        note: 'Figures from the catalogue on {day}.',
        rent: { caption: 'homes for rent', href: SITE.links.rent },
        sale: { caption: 'homes for sale', href: SITE.links.buy },
        cities: { caption: 'US cities', href: '/#cities' },
        median: { city: 'seattle', caption: 'median rent in {city}' },
    },
    scenarios: {
        title: 'Start from a search',
        items: [
            {
                icon: 'paw',
                label: 'Pet-friendly 2+ beds in Denver under $2,500',
                kind: 'For rent',
                href: '/browse?city=denver&beds=2&isPetFriendly=true&priceMax=2500',
            },
            {
                icon: 'home',
                label: 'Houses for sale in Austin',
                kind: 'For sale',
                href: '/browse?kind=sale&city=austin&type=HOUSE',
            },
            {
                icon: 'key',
                label: 'Furnished studios in Chicago',
                kind: 'For rent',
                href: '/browse?city=chicago&type=STUDIO&isFurnished=true',
            },
            {
                icon: 'building',
                label: 'Houses with 3+ beds and parking in Phoenix',
                kind: 'For rent',
                href: '/browse?city=phoenix&type=HOUSE&beds=3&hasParking=true',
            },
        ],
    },
    cities: {
        eyebrow: '6 cities',
        title: { start: 'Pick a city.', accent: 'Start looking.' },
        lead: 'Apartments, houses, condos, townhouses and studios in each one, for rent and for sale.',
        rent: 'For rent',
        buy: 'For sale',
        tagline: {
            austin: 'South Congress, Zilker, Mueller, East Austin and more',
            denver: 'Capitol Hill, LoHi, RiNo, Washington Park and more',
            seattle: 'Capitol Hill, Ballard, Fremont, Wallingford and more',
            chicago: 'Wicker Park, Logan Square, Lincoln Park, West Loop and more',
            atlanta: 'Midtown, Inman Park, Buckhead, West End and more',
            phoenix: 'Arcadia, Roosevelt Row, Biltmore, Ahwatukee and more',
        },
    },
    paths: {
        eyebrow: 'Rent or buy',
        title: { start: '2 ways', accent: 'to find a home.' },
        lead: 'The same search and the same homes, with the filters that matter for each.',
        switchLabel: 'Show the path for',
        cards: [
            {
                icon: 'key',
                title: 'Renting',
                text: 'The monthly rent, the move-in date, pets and furnishing, all up front.',
                points: [
                    { icon: 'calendar', title: 'Move in by a date', text: 'Filter by the day you need the keys.' },
                    { icon: 'paw', title: 'Pets and furniture', text: 'Pet-friendly and furnished homes at a tap.' },
                    {
                        icon: 'bell',
                        title: 'New matches by email',
                        text: 'Save the search. New homes arrive every morning.',
                    },
                ],
                cta: { label: 'Browse rentals', href: '/browse?kind=rent' },
            },
            {
                icon: 'home',
                title: 'Buying',
                text: 'The asking price and what it works out to per square foot.',
                points: [
                    {
                        icon: 'tag',
                        title: 'Price per square foot',
                        text: 'Every listing shows it, so homes compare at a glance.',
                    },
                    {
                        icon: 'building',
                        title: 'Houses, condos, townhouses',
                        text: 'Narrow the search to the type you want.',
                    },
                    {
                        icon: 'mail',
                        title: 'Straight to the seller',
                        text: 'Contact the owner or the agency from the listing.',
                    },
                ],
                cta: { label: 'Browse homes for sale', href: '/browse?kind=sale' },
            },
        ],
    },
    listing: {
        eyebrow: 'Every listing',
        title: { start: 'What a listing', accent: 'tells you.' },
        lead: 'Enough to decide on a viewing. Nothing left to guess.',
        points: [
            {
                icon: 'camera',
                title: 'Up to 20 photos',
                text: 'A gallery with the cover first, in the order the owner chose.',
            },
            {
                icon: 'tag',
                title: 'The price in context',
                text: 'The rent or asking price, the price per square foot, and how many similar homes are listed nearby.',
            },
            {
                icon: 'home',
                title: 'The facts and the terms',
                text: 'Rooms, size, type and the move-in day. Pets, furnishing and parking as a plain yes or no.',
            },
            {
                icon: 'lock',
                title: 'The address when it is yours to know',
                text: 'City, neighborhood and ZIP for everyone. The street once your viewing is confirmed.',
            },
        ],
        mock: {
            label: 'The side card of a listing page: the monthly rent, the neighborhood, who lists it, 4 facts, how many similar homes are nearby, and a contact button.',
            breadcrumb: 'Homes · For rent in {city}',
            lister: 'Harborline Realty',
            listedAgo: 'Listed 2 days ago',
            pets: 'Pets ok',
            photoCount: '1 / 5',
            nearby: '{count} more homes for rent in {neighborhood} right now.',
            nearbyLink: 'See them',
            contact: 'Contact Harborline Realty',
        },
    },
    steps: {
        eyebrow: 'How it works',
        title: { start: 'From a search', accent: 'to a set of keys.' },
        items: [
            {
                title: 'Search and filter',
                text: 'City, price, beds, baths, pets, furnishing, parking and move-in date, plus a text search that forgives typos. The link is the search: share it or come back to it.',
            },
            {
                title: 'Save homes and searches',
                text: 'A heart keeps a home. A saved search emails you once a day when new homes match. Only these 2 need a free tenant account.',
            },
            {
                title: 'Book a viewing',
                text: 'Pick a free slot and the landlord confirms. Then you see the exact address and can message them.',
            },
        ],
        note: 'All of it works today, viewings included. Book one on any home with viewing hours.',
    },
    owners: {
        eyebrow: 'For landlords and agents',
        title: { start: 'List your home.', accent: 'Keep it in order.' },
        lead: 'A dashboard for your own homes, or for every home of your agency, shared with your colleagues.',
        points: [
            {
                icon: 'plus',
                title: 'Create and edit',
                text: 'Title, description, type, price, rooms, size, amenities and the address. The street stays private.',
            },
            {
                icon: 'camera',
                title: 'Photos from the browser',
                text: 'Up to 20 JPEG, PNG or WebP photos, uploaded straight to storage. Put the cover first.',
            },
            {
                icon: 'toggle',
                title: 'Publish and unpublish',
                text: 'A draft goes live once it has a photo and your email is verified. Take it off the site any time.',
            },
            {
                icon: 'eye',
                title: 'Views and saves',
                text: 'See how many people opened each home and how many saved it.',
            },
        ],
        primary: 'List your home',
        secondary: 'Sign in',
        mock: {
            label: 'The owner dashboard: status tabs with counts, a chart of views and saves over the last 30 days, three homes with their views, saves and status, and a new viewing request.',
            title: 'Your listings',
            newListing: 'New listing',
            tabs: [
                { label: 'All', value: '17' },
                { label: 'Published', value: '14' },
                { label: 'Drafts', value: '2' },
                { label: 'Unpublished', value: '1' },
            ],
            interest: {
                title: 'Interest',
                period: 'Last 30 days',
                total: '1,284',
                unit: 'views',
                change: '+18%',
                views: 'Views',
                saves: 'Saves',
                viewBars: [3, 4, 3, 5, 6, 4, 5, 7, 6, 5, 6, 8, 7, 6, 8, 9, 7, 8, 10, 9],
                saveBars: [1, 1, 0, 1, 2, 1, 1, 2, 1, 1, 2, 2, 1, 2, 2, 3, 2, 2, 3, 2],
            },
            states: [
                { tone: 'success', word: 'Published', views: '128', saves: '9' },
                { tone: 'warning', word: 'Draft', views: '0', saves: '0' },
                { tone: 'success', word: 'Published', views: '61', saves: '4' },
            ],
            views: 'views',
            saves: 'saves',
            notice: { title: 'New viewing request', text: 'Saturday, 11:00 AM' },
        },
    },
    demo: {
        eyebrow: 'Try it',
        title: { start: '4 demo accounts.', accent: '1 password.' },
        lead: 'Everyone here is made up. Sign in as any of them to see their side.',
        passwordLabel: 'Password for every account:',
        note: 'The demo accounts cannot change their password or end their sessions, so the next visitor can use them too. You can also create your own account.',
        copy: 'Copy',
        copied: 'Copied',
        copiedStatus: 'Copied {value}',
        copyEmail: 'Copy {email}',
        copyPassword: 'Copy the demo password',
        signInAs: 'Sign in as {name}',
    },
    faq: {
        eyebrow: 'FAQ',
        title: { start: 'Questions', accent: 'people ask.' },
        items: [
            {
                question: 'Do I need an account to browse?',
                answer: 'No. Every published home, the search and the listing pages are open to everyone. You need a free tenant account only to save homes and searches and to book viewings.',
            },
            {
                question: 'Are the homes and people real?',
                answer: 'No. Keyhaven is a public demo. Every person, agency and home is made up, and the data resets every night.',
            },
            {
                question: 'Where is the exact address?',
                answer: 'A listing shows the city, neighborhood and ZIP. You see the street once your viewing is confirmed. The owner, their agency and Keyhaven staff see it from the start.',
            },
            {
                question: 'What does a landlord need to publish a home?',
                answer: 'A verified email address and at least 1 photo. You can edit a draft any time. Publishing puts it in the search at once, and unpublishing takes it out.',
            },
            {
                question: 'How do saved searches work?',
                answer: 'Save the filters you use under a name. Every morning at 08:00 UTC Keyhaven emails you up to 10 new homes that match, with a link to the full results. Nothing is sent when nothing is new.',
            },
            {
                question: 'Is Keyhaven open source?',
                answer: 'Yes. The code is on GitHub: a NestJS and PostgreSQL backend, a React frontend and this page. A single command runs it on your own machine.',
            },
        ],
    },
    cta: {
        title: { start: 'Where will you', accent: 'live next?' },
        lead: 'No sign-up, no card. Pick a path, set a few filters and see what is there.',
        choicesLabel: 'Choose a path',
        choices: [
            {
                icon: 'key',
                title: 'Rent a home',
                text: 'Monthly rent, move-in date, pets and furnishing up front.',
                href: SITE.links.rent,
            },
            {
                icon: 'home',
                title: 'Buy a home',
                text: 'Asking price, price per square foot and the seller one tap away.',
                href: SITE.links.buy,
            },
        ],
        secondary: 'List your home',
        source: 'Read the source on GitHub',
    },
};
