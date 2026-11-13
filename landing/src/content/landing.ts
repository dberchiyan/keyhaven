import type { IconName } from '@/components/ui/icons';

/**
 * Every word on the landing page, in one typed place — components only lay it out. A second
 * language is a second object of the same type. Claims follow CONTEXT.md: no invented numbers.
 */
export interface Step {
  title: string;
  text: string;
}

export interface OwnerPoint {
  icon: IconName;
  title: string;
  text: string;
}

export interface Question {
  q: string;
  a: string;
}

export const LANDING = {
  nav: [
    { href: '/browse?kind=rent', label: 'Rent' },
    { href: '/browse?kind=sale', label: 'Buy' },
    { href: '/browse?type=HOUSE', label: 'Houses' },
  ],
  header: {
    signIn: 'Sign in',
    listHome: 'List your home',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  hero: {
    eyebrow: 'Rent or buy · six US cities',
    titleStart: 'Find a home',
    titleAccent: 'you can picture living in.',
    lead: 'Apartments, houses, condos and studios to rent or to buy in Austin, Denver, Seattle, Chicago, Atlanta and Phoenix. Browse without an account; sign up only to save homes or to list one.',
    search: {
      legend: 'What are you looking for?',
      rent: 'Rent',
      buy: 'Buy',
      label: 'Where',
      placeholder: 'City, neighborhood or ZIP',
      submit: 'Search',
      hint: 'Typos are fine — "Walingford" still finds Wallingford.',
    },
    citiesLabel: 'Browse by city',
    mockLabel:
      'Three listing cards from the search page: a photo, the monthly rent, beds, baths and size, the neighborhood and the move-in date.',
  },
  highlights: [
    { value: 'No account', label: 'to browse every home' },
    { value: 'Six cities', label: 'from Seattle to Atlanta' },
    { value: 'Filters in the link', label: 'so a search can be shared' },
    { value: 'Light & dark', label: 'on any screen' },
  ],
  steps: {
    eyebrow: 'How it works',
    title: 'From a search to a set of keys',
    items: [
      {
        title: 'Search with filters that stay in the link',
        text: 'City, price, beds, baths, pets, furnished, parking, move-in date and a text search that forgives typos. The URL is the search: share it, come back to it, press Back.',
      },
      {
        title: 'Save homes and searches',
        text: 'A heart keeps a home; a saved search emails you once a day when new homes match. Both need a free tenant account — only for that.',
      },
      {
        title: 'Book a viewing',
        text: 'Pick a free slot, the landlord confirms, and the exact address is shared with you. The street stays private until then.',
      },
    ] satisfies readonly Step[],
    note: 'Viewing booking arrives in the next release; the rest is live today.',
  },
  owners: {
    eyebrow: 'For landlords and agents',
    title: 'List a home in minutes, keep it in order',
    lead: 'A dashboard for your own homes, or for every home of your agency, shared with your colleagues.',
    points: [
      {
        icon: 'plus',
        title: 'Create and edit',
        text: 'Title, description, type, price, rooms, size, amenities and the address — the street stays private.',
      },
      {
        icon: 'camera',
        title: 'Photos from the browser',
        text: 'Up to twenty JPEG, PNG or WebP photos, uploaded straight to storage; put the cover first.',
      },
      {
        icon: 'toggle',
        title: 'Publish, unpublish',
        text: 'A draft goes live when it has a photo and your email is verified; take it off the site any time.',
      },
      {
        icon: 'eye',
        title: 'Views and saves',
        text: 'See how many people opened each home and how many kept it.',
      },
    ] satisfies readonly OwnerPoint[],
    primary: 'List your home',
    secondary: 'Sign in',
    mockLabel:
      'The owner dashboard: counts of published, draft and unpublished homes, and a table of listings with their status, views and saves.',
  },
  demo: {
    eyebrow: 'Try it',
    title: 'Four demo accounts, one password',
    lead: 'Every person and home on the demo is fictional. Sign in as any of them to see that role’s side of Keyhaven.',
    passwordLabel: 'Password for every account:',
    open: 'Open the app',
    note: 'The showcase accounts cannot change their password or end their sessions, so the next visitor can use them too. Anyone can create their own account.',
    copy: 'Copy',
    copied: 'Copied',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions people ask',
    items: [
      {
        q: 'Do I need an account to browse?',
        a: 'No. Every published home, the search and the listing pages are open to everyone. A free tenant account is needed only to save homes and searches, and later to book viewings.',
      },
      {
        q: 'Are the homes and people real?',
        a: 'No. Keyhaven is a public demo: every person, agency and home is fictional, and the data is reset regularly.',
      },
      {
        q: 'Where is the exact address?',
        a: 'A listing shows the city, neighborhood and ZIP. The street address is shared with you once a viewing is confirmed; the owner, their agency and Keyhaven staff see it from the start.',
      },
      {
        q: 'What does a landlord need to publish a home?',
        a: 'A verified email address and at least one photo. A draft can be edited any time; publishing puts it in the search at once, unpublishing takes it out.',
      },
      {
        q: 'How do saved searches work?',
        a: 'Save the filters you are using under a name. Every morning at 08:00 UTC Keyhaven emails you the homes published since the last email that match — up to ten, with a link to the full results. Nothing is sent when nothing is new.',
      },
      {
        q: 'Is Keyhaven open source?',
        a: 'Yes. The code — a NestJS and PostgreSQL backend, a React frontend and this page — is on GitHub, with one command to run it on your own machine.',
      },
    ] satisfies readonly Question[],
  },
  cta: {
    title: 'Start with a search',
    lead: 'No sign-up, no card. Pick a city, set a few filters and see what is there.',
    primary: 'Browse homes',
    secondary: 'List your home',
    source: 'Read the source on GitHub',
  },
  footer: {
    tagline:
      'Homes to rent and to buy in Austin, Denver, Seattle, Chicago, Atlanta and Phoenix. Browse without an account; sign in to save homes or to list one.',
    product: 'Browse',
    cities: 'Cities',
    account: 'Account',
    github: 'Source on GitHub',
    readme: 'About Keyhaven',
    issues: 'Issues',
    icons: {
      github: 'Keyhaven on GitHub',
      readme: 'How Keyhaven is built (README)',
      email: 'Email Keyhaven',
    },
    rights: 'A public demo — every person and home is fictional.',
    haveAccount: 'Have an account?',
    signIn: 'Sign in',
  },
} as const;
