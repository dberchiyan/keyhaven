const DURATION_MS = 1200;
const NUMBER = new Intl.NumberFormat('en-US');
const DIGITS = /[\d,]+/;
const EASE_POWER = 3;

/** Plays one figure from 0 to the value already in its text, keeping what surrounds the digits (`$`). */
const play = (element: HTMLElement, final: string): void => {
    const target = Number(final.replace(/\D/g, ''));
    const startedAt = performance.now();
    const step = (now: number): void => {
        const progress = Math.min((now - startedAt) / DURATION_MS, 1);
        const eased = 1 - (1 - progress) ** EASE_POWER;
        element.textContent = final.replace(DIGITS, NUMBER.format(Math.round(target * eased)));
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    requestAnimationFrame(step);
};

/**
 * The proof figures count up once as they enter the screen (LD-18), through an observer (LD-28); the final digits
 * stay in the markup, so without JS or under reduced motion the figures simply stand.
 */
export const countUp = (): void => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    const finals = new Map<Element, string>();
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const final = finals.get(entry.target);
            if (entry.isIntersecting && entry.target instanceof HTMLElement && final) {
                observer.unobserve(entry.target);
                play(entry.target, final);
            }
        }
    });
    for (const element of document.querySelectorAll<HTMLElement>('[data-count]')) {
        const final = element.textContent.trim();
        finals.set(element, final);
        element.textContent = final.replace(DIGITS, '0');
        observer.observe(element);
    }
};
