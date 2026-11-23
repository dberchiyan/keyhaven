/**
 * The phone dock shows once the hero has scrolled away and hides again at the closing panel, so the primary action
 * sits under the thumb without doubling the hero's or the closing's own buttons (LD-18). An observer, never a scroll
 * listener (LD-28); hidden, it is `inert`.
 */
export const followDock = (): void => {
    const dock = document.getElementById('mobile-dock');
    const hero = document.querySelector('[data-dock-before]');
    const closing = document.querySelector('[data-dock-after]');
    if (!dock || !hero || !closing) {
        return;
    }
    const state = { isHeroVisible: true, isClosingReached: false };
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.target === hero) {
                state.isHeroVisible = entry.isIntersecting;
            }
            if (entry.target === closing) {
                state.isClosingReached = entry.isIntersecting || entry.boundingClientRect.top < 0;
            }
        }
        const isShown = !state.isHeroVisible && !state.isClosingReached;
        dock.toggleAttribute('data-shown', isShown);
        dock.inert = !isShown;
    });
    observer.observe(hero);
    observer.observe(closing);
};
