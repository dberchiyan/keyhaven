import type { Link } from './landing-types';

export interface ChromeContent {
    skipLink: string;
    newTab: string;
    header: {
        homeLabel: string;
        sectionsLabel: string;
        anchors: readonly Link[];
        signIn: string;
        primary: string;
        listHome: string;
        openMenu: string;
        closeMenu: string;
        dockLabel: string;
    };
    footer: {
        tagline: string;
        browse: string;
        cities: string;
        company: string;
        about: string;
        github: string;
        profilesLabel: string;
        profiles: { github: string; readme: string };
        rights: string;
        legal: string;
        privacy: string;
        terms: string;
        signIn: string;
        browseLinks: readonly Link[];
    };
}

export const CHROME: ChromeContent = {
    skipLink: 'Skip to content',
    newTab: '(opens in a new tab)',
    header: {
        homeLabel: 'Keyhaven home',
        sectionsLabel: 'Sections',
        anchors: [
            { label: 'Cities', href: '/#cities' },
            { label: 'Rent or buy', href: '/#rent-or-buy' },
            { label: 'Listings', href: '/#listing' },
            { label: 'For owners', href: '/#owners' },
            { label: 'FAQ', href: '/#faq' },
        ],
        signIn: 'Sign in',
        primary: 'Browse homes',
        listHome: 'List your home',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
        dockLabel: 'Quick actions',
    },
    footer: {
        tagline: 'Homes to rent and to buy in 6 US cities.',
        browse: 'Browse',
        cities: 'Cities',
        company: 'Company',
        about: 'About',
        github: 'Source on GitHub',
        profilesLabel: 'Keyhaven elsewhere',
        profiles: { github: 'Keyhaven on GitHub', readme: 'Keyhaven docs on GitHub' },
        rights: 'Public demo: all people and homes are made up.',
        legal: 'Legal',
        privacy: 'Privacy',
        terms: 'Terms',
        signIn: 'Sign in',
        browseLinks: [
            { label: 'Rent', href: '/browse?kind=rent' },
            { label: 'Buy', href: '/browse?kind=sale' },
            { label: 'Houses', href: '/browse?type=HOUSE' },
        ],
    },
};
