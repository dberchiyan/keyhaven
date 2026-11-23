const VISIBLE_SHARE = 0.1;

/** Restarting every film at once: drop the gate, let the browser apply that, put it back. */
const replay = (frame: HTMLElement, pause: HTMLButtonElement | null): void => {
    frame.removeAttribute('data-paused');
    pause?.setAttribute('aria-pressed', 'false');
    frame.removeAttribute('data-visible');
    void frame.offsetWidth;
    frame.setAttribute('data-visible', '');
};

/** The film starts once a tenth of it is in view (it is taller than most viewports); the buttons hold the only state CSS cannot. */
export const startSearchDemos = (): void => {
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.setAttribute('data-visible', '');
                    observer.unobserve(entry.target);
                }
            }
        },
        { threshold: VISIBLE_SHARE },
    );
    for (const frame of document.querySelectorAll<HTMLElement>('[data-demo]')) {
        observer.observe(frame);
        const root = frame.parentElement;
        const pause = root?.querySelector<HTMLButtonElement>('[data-demo-pause]') ?? null;
        pause?.addEventListener('click', () => {
            pause.setAttribute('aria-pressed', String(frame.toggleAttribute('data-paused')));
        });
        root?.querySelector('[data-demo-replay]')?.addEventListener('click', () => {
            replay(frame, pause);
        });
    }
};
