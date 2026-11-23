export const SEED_PASSWORD = 'Keyhaven-Demo-2026!';

export interface SeedPerson {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
}

export const AGENCY = {
    id: '019a0000-0000-7000-8000-00000000a001',
    name: 'Harborline Realty',
    email: 'hello@harborline.example',
    phone: '+1 206 555 0142',
    website: 'https://harborline.example',
    description:
        'A boutique rental agency with homes in six cities. Viewings seven days a week; every home is visited by an agent before it is listed.',
} as const;

export const DEMO_TENANT: SeedPerson = {
    firstName: 'Maya',
    lastName: 'Lopez',
    email: 'maya.lopez@keyhaven.example',
};
export const DEMO_LANDLORD: SeedPerson = {
    firstName: 'Daniel',
    lastName: 'Reyes',
    email: 'daniel.reyes@keyhaven.example',
    phone: '+1 512 555 0168',
};
export const DEMO_AGENT: SeedPerson = {
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya.nair@harborline.example',
    phone: '+1 206 555 0177',
};
export const DEMO_ADMIN: SeedPerson = {
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex.morgan@keyhaven.example',
};

export const OTHER_AGENTS: SeedPerson[] = [
    {
        firstName: 'Jordan',
        lastName: 'Whitfield',
        email: 'jordan.whitfield@harborline.example',
        phone: '+1 206 555 0151',
    },
    {
        firstName: 'Camila',
        lastName: 'Duarte',
        email: 'camila.duarte@harborline.example',
        phone: '+1 206 555 0163',
    },
    {
        firstName: 'Ethan',
        lastName: 'Park',
        email: 'ethan.park@harborline.example',
        phone: '+1 206 555 0189',
    },
];

const FIRST_NAMES = [
    'Olivia',
    'Liam',
    'Sophia',
    'Noah',
    'Ava',
    'Mateo',
    'Isabella',
    'Lucas',
    'Mia',
    'Elijah',
    'Charlotte',
    'James',
    'Amelia',
    'Benjamin',
    'Harper',
    'Henry',
    'Evelyn',
    'Theodore',
    'Luna',
    'Sebastian',
    'Zoe',
    'Jack',
    'Nora',
    'Samuel',
    'Layla',
    'Owen',
    'Grace',
    'Caleb',
    'Aria',
    'Leo',
    'Hannah',
    'Julian',
    'Stella',
    'Gabriel',
    'Ivy',
    'Adrian',
    'Violet',
    'Miles',
    'Ruby',
    'Isaac',
];
const LAST_NAMES = [
    'Bennett',
    'Okafor',
    'Lindqvist',
    'Silva',
    'Hartmann',
    'Petrov',
    'Andersen',
    'Nakamura',
    'Costa',
    'Varga',
    'Jensen',
    'Brooks',
    'Horvat',
    'Byrne',
    'Marchetti',
    'Ferreira',
    'Novotny',
    'Lambert',
    'Sato',
    'Gruber',
    'Kovac',
    'Becker',
    'Mendes',
    'Haddad',
    'Popescu',
    'Schulz',
    'Lund',
    'Ivanov',
    'Brandt',
    'Weiss',
    'Carter',
    'Reid',
    'Thompson',
    'Kim',
    'Novak',
    'Fischer',
    'Rossi',
    'Walsh',
    'Dubois',
    'Kowalski',
];

/** 40 fictional landlords, every name used once. */
export const OTHER_LANDLORDS: SeedPerson[] = FIRST_NAMES.map((firstName, index) => {
    const lastName = LAST_NAMES[index] ?? 'Smith';
    return {
        firstName,
        lastName,
        email: `${firstName}.${lastName}@keyhaven.example`.toLowerCase(),
        phone: `+1 ${[303, 312, 404, 512, 602, 206][index % 6] ?? 512} 555 ${String(100 + index).padStart(4, '0')}`,
    };
});

/**
 * 24 fictional renters (tenants) besides the showcase one: their visits and saves over the
 * last months feed the owners' insights. Names are the landlords' pools re-paired, so no
 * email collides with a landlord's.
 */
export const OTHER_TENANTS: SeedPerson[] = FIRST_NAMES.slice(0, 24).map((firstName, index) => {
    const lastName = LAST_NAMES[(index + 13) % LAST_NAMES.length] ?? 'Smith';
    return {
        firstName,
        lastName,
        email: `${firstName}.${lastName}@renters.example`.toLowerCase(),
    };
});

export interface SeedCity {
    id: string;
    name: string;
    state: string;
    slug: string;
    timeZone: string;
    oneBedroomRent: number;
    twoBedroomSalePrice: number;
    zipPrefix: string;
    neighborhoods: readonly string[];
    streets: readonly string[];
}

export const CITIES: readonly SeedCity[] = [
    {
        id: '019a0000-0000-7000-8000-0000000c0001',
        name: 'Austin',
        state: 'TX',
        slug: 'austin',
        timeZone: 'America/Chicago',
        oneBedroomRent: 1650,
        twoBedroomSalePrice: 430_000,
        zipPrefix: '787',
        neighborhoods: [
            'South Congress',
            'Zilker',
            'Mueller',
            'East Austin',
            'Hyde Park',
            'Barton Hills',
            'Clarksville',
        ],
        streets: ['Barton Springs Rd', 'S Lamar Blvd', 'E 6th St', 'Guadalupe St', 'Manor Rd', 'Duval St', 'W Lynn St'],
    },
    {
        id: '019a0000-0000-7000-8000-0000000c0002',
        name: 'Denver',
        state: 'CO',
        slug: 'denver',
        timeZone: 'America/Denver',
        oneBedroomRent: 1700,
        twoBedroomSalePrice: 540_000,
        zipPrefix: '802',
        neighborhoods: ['Capitol Hill', 'LoHi', 'RiNo', 'Washington Park', 'Cherry Creek', 'Baker', 'Highland'],
        streets: ['E Colfax Ave', 'Tejon St', 'Larimer St', 'S Downing St', 'E 1st Ave', 'Broadway', 'W 32nd Ave'],
    },
    {
        id: '019a0000-0000-7000-8000-0000000c0003',
        name: 'Seattle',
        state: 'WA',
        slug: 'seattle',
        timeZone: 'America/Los_Angeles',
        oneBedroomRent: 2050,
        twoBedroomSalePrice: 790_000,
        zipPrefix: '981',
        neighborhoods: ['Capitol Hill', 'Ballard', 'Fremont', 'Queen Anne', 'Columbia City', 'Wallingford', 'Belltown'],
        streets: [
            'E Pine St',
            'NW Market St',
            'N 36th St',
            'Queen Anne Ave N',
            'Rainier Ave S',
            'N 45th St',
            '2nd Ave',
        ],
    },
    {
        id: '019a0000-0000-7000-8000-0000000c0004',
        name: 'Chicago',
        state: 'IL',
        slug: 'chicago',
        timeZone: 'America/Chicago',
        oneBedroomRent: 1800,
        twoBedroomSalePrice: 360_000,
        zipPrefix: '606',
        neighborhoods: ['Logan Square', 'Wicker Park', 'Lakeview', 'Lincoln Park', 'Pilsen', 'Hyde Park', 'West Loop'],
        streets: [
            'N Milwaukee Ave',
            'W Division St',
            'N Clark St',
            'W Fullerton Ave',
            'W 18th St',
            'S Woodlawn Ave',
            'W Randolph St',
        ],
    },
    {
        id: '019a0000-0000-7000-8000-0000000c0005',
        name: 'Atlanta',
        state: 'GA',
        slug: 'atlanta',
        timeZone: 'America/New_York',
        oneBedroomRent: 1550,
        twoBedroomSalePrice: 390_000,
        zipPrefix: '303',
        neighborhoods: [
            'Midtown',
            'Inman Park',
            'Old Fourth Ward',
            'Virginia-Highland',
            'West End',
            'Grant Park',
            'Buckhead',
        ],
        streets: [
            'Peachtree St NE',
            'Edgewood Ave',
            'N Highland Ave',
            'Boulevard NE',
            'Ralph David Abernathy Blvd',
            'Cherokee Ave SE',
            'Roswell Rd',
        ],
    },
    {
        id: '019a0000-0000-7000-8000-0000000c0006',
        name: 'Phoenix',
        state: 'AZ',
        slug: 'phoenix',
        timeZone: 'America/Phoenix',
        oneBedroomRent: 1400,
        twoBedroomSalePrice: 440_000,
        zipPrefix: '850',
        neighborhoods: ['Arcadia', 'Roosevelt Row', 'Biltmore', 'Coronado', 'Willo', 'Encanto', 'Ahwatukee'],
        streets: [
            'E Camelback Rd',
            'N 7th St',
            'E Indian School Rd',
            'N 3rd Ave',
            'W Thomas Rd',
            'E McDowell Rd',
            'S 48th St',
        ],
    },
];
