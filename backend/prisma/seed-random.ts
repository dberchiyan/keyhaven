/** A small deterministic PRNG (mulberry32), so every run generates the same catalogue. */
export const random = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/** One item by a roll in [0, 1); an empty list is a bug in the seed's data. */
export const pick = <T>(items: readonly T[], roll: number): T => {
    const item = items[Math.floor(roll * items.length)];
    if (item === undefined) {
        throw new Error('pick from an empty list');
    }
    return item;
};

/** One item by an index, wrapping around, so a listing's index picks the same text on every run. */
export const cycle = <T>(items: readonly T[], index: number): T => {
    const item = items[index % items.length];
    if (item === undefined) {
        throw new Error('pick from an empty list');
    }
    return item;
};
