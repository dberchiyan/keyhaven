import { Prisma } from '@/generated/prisma/client';

export type Decimal = Prisma.Decimal;

export const MONEY_SCALE = 4;
const CENT_SCALE = 2;

export const Currency = { USD: 'USD' } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export interface Money {
    amount: string;
    currency: string;
}

/** DATA-20, API-13: a Decimal in code and NUMERIC(19,4) in the database becomes `{ amount: "4500.0000", currency }` on the wire. */
export const toMoney = (amount: Decimal, currency: string): Money => ({
    amount: amount.toFixed(MONEY_SCALE),
    currency,
});

/** Parses a validated decimal string (never a JS number). */
export const toDecimal = (amount: string): Decimal => new Prisma.Decimal(amount);

/** Rounded to the cent, ROUND_HALF_UP. */
export const roundToCents = (amount: Decimal): Decimal =>
    amount.toDecimalPlaces(CENT_SCALE, Prisma.Decimal.ROUND_HALF_UP);
