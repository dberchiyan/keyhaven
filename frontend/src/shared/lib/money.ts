import { DECIMAL_RADIX } from './units';

export interface Money {
    amount: string;
    currency: string;
}

const SCALE = 4;
const UNITS_PER_WHOLE = BigInt(DECIMAL_RADIX) ** BigInt(SCALE);
const NO_UNITS = BigInt(0);
const CENTS_DIGITS = 2;
const AMOUNT = /^(-?)(\d+)(?:\.(\d{1,4}))?$/;

/**
 * Exact integer in ten-thousandths ("4500.5" → 45005000n): amounts never become floats (QRY-20),
 * so sums and divisions stay exact.
 */
export const toUnits = (amount: string): bigint => {
    const match = AMOUNT.exec(amount);
    if (!match) {
        throw new Error('Not a decimal amount');
    }
    const [, sign = '', whole = '0', fraction = ''] = match;
    const units = BigInt(whole) * UNITS_PER_WHOLE + BigInt(fraction.padEnd(SCALE, '0'));
    return sign === '-' ? -units : units;
};

/** The decimal string of a non-negative unit count — the way back from `toUnits` (QRY-20). */
export const fromUnits = (units: bigint): string =>
    `${units / UNITS_PER_WHOLE}.${String(units % UNITS_PER_WHOLE).padStart(SCALE, '0')}`;

const isDecimalLiteral = (amount: string): amount is Intl.StringNumericLiteral => AMOUNT.test(amount);

/**
 * Localised currency text from the string itself — Intl accepts decimal strings, so the amount is
 * never parsed into a float (QRY-20); whole amounts drop the cents.
 */
export const formatMoney = (money: Money, locale: string): string => {
    if (!isDecimalLiteral(money.amount)) {
        throw new Error('Not a decimal amount');
    }
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: money.currency,
        maximumFractionDigits: toUnits(money.amount) % UNITS_PER_WHOLE === NO_UNITS ? 0 : CENTS_DIGITS,
    }).format(money.amount);
};
