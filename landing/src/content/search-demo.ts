export interface DemoHome {
    price: string;
    title: string;
    facts: string;
    place: string;
    pill: string;
}

export interface DemoPill {
    label: string;
    visibleFrom: 'md' | 'lg' | 'xl';
}

export interface SearchDemoContent {
    label: string;
    controls: { pause: string; play: string; replay: string };
    city: { label: string; picked: string; options: readonly string[] };
    beds: { label: string; picked: string; pickedOption: string; options: readonly string[] };
    pillsBeforeBeds: readonly DemoPill[];
    pillsAfterBeds: readonly DemoPill[];
    more: string;
    remove: string;
    homes: string;
    matchCount: number;
    clear: string;
    sets: {
        all: readonly DemoHome[];
        city: readonly DemoHome[];
        matches: readonly DemoHome[];
    };
}

export const SEARCH_DEMO: SearchDemoContent = {
    label: 'A search on Keyhaven, played out: Seattle is picked under City, then 3+ under Bedrooms; the count drops from every home to 12, a chip appears for each filter, and the results change to 3-bedroom homes in Seattle.',
    controls: { pause: 'Pause the demo', play: 'Play the demo', replay: 'Replay the demo' },
    city: {
        label: 'City',
        picked: 'Seattle, WA',
        options: ['Austin, TX', 'Denver, CO', 'Seattle, WA', 'Chicago, IL', 'Atlanta, GA', 'Phoenix, AZ'],
    },
    beds: { label: 'Bedrooms', picked: '3+ beds', pickedOption: '3+', options: ['Any', '1+', '2+', '3+', '4+'] },
    remove: '✕',
    pillsBeforeBeds: [{ label: 'Price', visibleFrom: 'md' }],
    pillsAfterBeds: [
        { label: 'Bathrooms', visibleFrom: 'lg' },
        { label: 'Type of home', visibleFrom: 'xl' },
    ],
    more: 'More',
    homes: '{count} homes',
    matchCount: 12,
    clear: 'Clear filters',
    sets: {
        all: [
            {
                price: '$2,825/mo',
                title: 'Sunny 2-bedroom house in Clarksville',
                facts: '2 beds · 1.5 baths · 1,160 sq ft',
                place: 'Clarksville · Austin, TX',
                pill: 'Available Nov 23',
            },
            {
                price: '$2,950/mo',
                title: 'Bright 3-bedroom townhouse in Washington Park',
                facts: '3 beds · 1.5 baths · 1,550 sq ft',
                place: 'Washington Park · Denver, CO',
                pill: 'Available Dec 18',
            },
            {
                price: '$1,850/mo',
                title: 'Quiet 1-bedroom apartment in Wicker Park',
                facts: '1 bed · 1 bath · 720 sq ft',
                place: 'Wicker Park · Chicago, IL',
                pill: 'Available now',
            },
        ],
        city: [
            {
                price: '$2,450/mo',
                title: 'Sunny 2-bedroom apartment in Capitol Hill',
                facts: '2 beds · 1.5 baths · 940 sq ft',
                place: 'Capitol Hill · Seattle, WA',
                pill: 'Available Dec 1',
            },
            {
                price: '$2,100/mo',
                title: 'Corner condo with a Ballard view',
                facts: '1 bed · 1 bath · 760 sq ft',
                place: 'Ballard · Seattle, WA',
                pill: 'Available Jan 8',
            },
            {
                price: '$1,950/mo',
                title: 'Loft over the Fremont canal',
                facts: 'Studio · 1 bath · 610 sq ft',
                place: 'Fremont · Seattle, WA',
                pill: 'Available now',
            },
        ],
        matches: [
            {
                price: '$3,775/mo',
                title: 'Quiet 3-bedroom house in Wallingford',
                facts: '3 beds · 2.5 baths · 1,192 sq ft',
                place: 'Wallingford · Seattle, WA',
                pill: 'Available Jan 16',
            },
            {
                price: '$3,250/mo',
                title: 'Sunny 3-bedroom townhouse in Ballard',
                facts: '3 beds · 2 baths · 1,380 sq ft',
                place: 'Ballard · Seattle, WA',
                pill: 'Available Dec 12',
            },
            {
                price: '$4,200/mo',
                title: 'Renovated 4-bedroom house near Green Lake',
                facts: '4 beds · 2.5 baths · 1,860 sq ft',
                place: 'Green Lake · Seattle, WA',
                pill: 'Available Feb 1',
            },
            {
                price: '$2,975/mo',
                title: 'Bright 3-bedroom condo in Fremont',
                facts: '3 beds · 2 baths · 1,210 sq ft',
                place: 'Fremont · Seattle, WA',
                pill: 'Available Dec 20',
            },
            {
                price: '$3,100/mo',
                title: 'Airy 3-bedroom apartment in Capitol Hill',
                facts: '3 beds · 1.5 baths · 1,090 sq ft',
                place: 'Capitol Hill · Seattle, WA',
                pill: 'Available Jan 3',
            },
            {
                price: '$4,450/mo',
                title: 'Family 4-bedroom craftsman in Wallingford',
                facts: '4 beds · 3 baths · 2,040 sq ft',
                place: 'Wallingford · Seattle, WA',
                pill: 'Available Mar 1',
            },
        ],
    },
};
