import { Prisma } from '../../generated/prisma/client';

/** Money is a Decimal in code, NUMERIC(19,4) in the database, a string on the wire. */
export type Decimal = Prisma.Decimal;

export const Currency = { USD: 'USD' } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export interface Money {
  amount: string;
  currency: string;
}

/** Wire format: `{ amount: "4500.0000", currency: "USD" }`. */
export const toMoney = (amount: Decimal, currency: string): Money => ({
  amount: amount.toFixed(4),
  currency,
});

/** Parses a validated decimal string (never a JS number). */
export const toDecimal = (amount: string): Decimal => new Prisma.Decimal(amount);

/** Rounded to the cent, ROUND_HALF_UP. */
export const roundToCents = (amount: Decimal): Decimal =>
  amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
