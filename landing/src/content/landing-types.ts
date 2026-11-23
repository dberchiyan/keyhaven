import type { IconName } from '../components/ui/icons';

export interface Heading {
    start: string;
    accent: string;
}

export interface Point {
    icon: IconName;
    title: string;
    text: string;
}

export interface Link {
    label: string;
    href: string;
}

export interface Question {
    question: string;
    answer: string;
}

export interface Scenario {
    icon: IconName;
    label: string;
    kind: string;
    href: string;
}

export interface ChoiceCard {
    icon: IconName;
    title: string;
    text: string;
    href: string;
}

export interface ProofFigureCopy {
    caption: string;
    href: string;
}

export interface PathCard {
    icon: IconName;
    title: string;
    text: string;
    points: readonly Point[];
    cta: Link;
}

export interface DashboardTab {
    label: string;
    value: string;
}

export interface DashboardInterest {
    title: string;
    period: string;
    total: string;
    unit: string;
    change: string;
    views: string;
    saves: string;
    viewBars: readonly number[];
    saveBars: readonly number[];
}

export interface DashboardNotice {
    title: string;
    text: string;
}

export interface DashboardState {
    tone: 'success' | 'warning';
    word: string;
    views: string;
    saves: string;
}

export interface LandingContent {
    meta: { title: string; description: string; updatedOn: string };
    hero: {
        eyebrow: string;
        title: Heading;
        lead: string;
        leadShort: string;
        search: { legend: string; rent: string; buy: string; label: string; placeholder: string; submit: string };
        hint: string;
        citiesLabel: string;
    };
    proof: {
        label: string;
        note: string;
        rent: ProofFigureCopy;
        sale: ProofFigureCopy;
        cities: ProofFigureCopy;
        median: { city: string; caption: string };
    };
    scenarios: { title: string; items: readonly Scenario[] };
    cities: {
        eyebrow: string;
        title: Heading;
        lead: string;
        rent: string;
        buy: string;
        tagline: Record<string, string>;
    };
    paths: { eyebrow: string; title: Heading; lead: string; switchLabel: string; cards: readonly PathCard[] };
    listing: {
        eyebrow: string;
        title: Heading;
        lead: string;
        points: readonly Point[];
        mock: {
            label: string;
            breadcrumb: string;
            lister: string;
            listedAgo: string;
            pets: string;
            photoCount: string;
            nearby: string;
            nearbyLink: string;
            contact: string;
        };
    };
    steps: { eyebrow: string; title: Heading; items: readonly { title: string; text: string }[]; note: string };
    owners: {
        eyebrow: string;
        title: Heading;
        lead: string;
        points: readonly Point[];
        primary: string;
        secondary: string;
        mock: {
            label: string;
            title: string;
            newListing: string;
            tabs: readonly DashboardTab[];
            interest: DashboardInterest;
            states: readonly DashboardState[];
            views: string;
            saves: string;
            notice: DashboardNotice;
        };
    };
    demo: {
        eyebrow: string;
        title: Heading;
        lead: string;
        passwordLabel: string;
        note: string;
        copy: string;
        copied: string;
        copiedStatus: string;
        copyEmail: string;
        copyPassword: string;
        signInAs: string;
    };
    faq: { eyebrow: string; title: Heading; items: readonly Question[] };
    cta: {
        title: Heading;
        lead: string;
        choicesLabel: string;
        choices: readonly ChoiceCard[];
        secondary: string;
        source: string;
    };
}
