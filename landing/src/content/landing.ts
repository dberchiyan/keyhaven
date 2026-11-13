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

export interface PopularSearch {
  label: string;
  /** The app's search page with these filters. */
  href: string;
}

export interface Path {
  icon: IconName;
  title: string;
  text: string;
}

export interface ListingPoint {
  icon: IconName;
  title: string;
  text: string;
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
  popular: {
    title: 'Popular searches',
    items: [
      {
        label: '2-bed apartments for rent in Seattle',
        href: '/browse?city=seattle&beds=2&type=APARTMENT',
      },
      { label: 'Houses for sale in Austin', href: '/browse?kind=sale&city=austin&type=HOUSE' },
      { label: 'Pet-friendly rentals in Denver', href: '/browse?city=denver&pets=true' },
      { label: 'Furnished homes in Chicago', href: '/browse?city=chicago&furnished=true' },
      {
        label: 'Studios under $1,500 in Phoenix',
        href: '/browse?city=phoenix&type=STUDIO&priceMax=1500',
      },
      {
        label: 'Townhouses for sale in Atlanta',
        href: '/browse?kind=sale&city=atlanta&type=TOWNHOUSE',
      },
    ] satisfies readonly PopularSearch[],
  },
  cities: {
    eyebrow: 'Six cities',
    title: 'Pick a city, start looking',
    lead: 'Apartments, houses, condos, townhouses and studios in every one of them — for rent and for sale.',
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
    title: 'Two ways to find a home',
    lead: 'The same search, the same homes — with the filters that matter for each.',
    rent: {
      title: 'Renting',
      text: 'Monthly rent, the move-in date, pets and furnishing up front; a twelve-month lease is the norm.',
      points: [
        {
          icon: 'calendar',
          title: 'Move in by a date',
          text: 'Filter by the day you need the keys.',
        },
        {
          icon: 'paw',
          title: 'Pets and furniture',
          text: 'Pet-friendly and furnished homes, one tap each.',
        },
        {
          icon: 'bell',
          title: 'New matches by email',
          text: 'Save the search and get the new homes every morning.',
        },
      ] satisfies readonly Path[],
      cta: 'Browse rentals',
      href: '/browse?kind=rent',
    },
    buy: {
      title: 'Buying',
      text: 'The asking price and what it works out to per square foot, by type of home and neighborhood.',
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
      ] satisfies readonly Path[],
      cta: 'Browse homes for sale',
      href: '/browse?kind=sale',
    },
  },
  listing: {
    eyebrow: 'Every listing',
    title: 'What a listing tells you',
    lead: 'Enough to decide whether to ask for a viewing — and nothing you have to guess.',
    points: [
      {
        icon: 'camera',
        title: 'Up to twenty photos',
        text: 'A gallery with the cover first, as the owner arranged it.',
      },
      {
        icon: 'tag',
        title: 'The price in context',
        text: 'Monthly rent or asking price, the price per square foot, and how many similar homes are listed nearby right now.',
      },
      {
        icon: 'home',
        title: 'The facts and the terms',
        text: 'Rooms, size, type, the move-in day; pets, furnishing and parking as plain yes or no.',
      },
      {
        icon: 'lock',
        title: 'The address, when it is yours to know',
        text: 'City, neighborhood and ZIP for everyone; the street once a viewing is confirmed.',
      },
    ] satisfies readonly ListingPoint[],
    mockLabel:
      'The side card of a listing page: the monthly rent, the neighborhood, who lists it, four facts, how many similar homes are nearby, and a contact button.',
  },
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
    tagline: 'Homes to rent and to buy in six US cities.',
    product: 'Browse',
    cities: 'Cities',
    company: 'Company',
    about: 'About',
    github: 'Source on GitHub',
    icons: {
      github: 'Keyhaven on GitHub',
      readme: 'Docs (README)',
      email: 'Email Keyhaven',
    },
    rights: 'Public demo: all people and homes are fictional.',
    signIn: 'Sign in',
  },
} as const;
