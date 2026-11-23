export const STAGGER = [
    '[--i:0]',
    '[--i:1]',
    '[--i:2]',
    '[--i:3]',
    '[--i:4]',
    '[--i:5]',
    '[--i:6]',
    '[--i:7]',
] as const;

/** Per-item delays are literal classes the build can see: a `style` attribute would break `style-src 'self'` (LD-45). */
export const staggerClass = (index: number): string => STAGGER[Math.min(index, STAGGER.length - 1)] ?? '';
