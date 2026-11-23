const READING_LINE = '-40% 0px -55% 0px';

/** The header highlights the section being read (LD-18); an observer, never a scroll listener (LD-28). */
export const markCurrentSection = (): void => {
    const links = new Map<string, HTMLAnchorElement>();
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-section-link]')) {
        const target = new URL(link.href).hash.slice(1);
        if (new URL(link.href).pathname === window.location.pathname && target) {
            links.set(target, link);
        }
    }
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const link = links.get(entry.target.id);
                if (entry.isIntersecting) {
                    link?.setAttribute('aria-current', 'location');
                } else {
                    link?.removeAttribute('aria-current');
                }
            }
        },
        { rootMargin: READING_LINE },
    );
    for (const id of links.keys()) {
        const section = document.getElementById(id);
        if (section) {
            observer.observe(section);
        }
    }
};
