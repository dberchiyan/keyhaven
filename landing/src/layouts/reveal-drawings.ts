const VISIBLE_SHARE = 0.35;
const REVEAL_MARGIN = '0px 0px -12% 0px';
const REVEALED = '.reveal, .reveal-text, .reveal-list, .reveal-media, .line-reveal';

/** Marks each element visible once, when it first enters the screen (LD-28): an observer, never a scroll listener. */
const observeOnce = (selector: string, options: IntersectionObserverInit): void => {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.setAttribute('data-visible', '');
                observer.unobserve(entry.target);
            }
        }
    }, options);
    for (const element of document.querySelectorAll(selector)) {
        observer.observe(element);
    }
};

/**
 * Drawings of the app come alive once a third of them is on screen; sections, cards and lists play their entrance
 * once as their top edge passes the lower eighth of the screen (LD-27, LD-28). CSS does the motion.
 */
export const revealDrawings = (): void => {
    observeOnce('[data-animate]', { threshold: VISIBLE_SHARE });
    observeOnce(REVEALED, { rootMargin: REVEAL_MARGIN });
};
