const LINE_PROPERTY = '--line';

/** Reads every heading's word positions first, then writes the line indices, so one pass never forces two layouts. */
const indexLines = (headings: readonly HTMLElement[]): void => {
    const plans = headings.map((heading) => {
        const words = [...heading.querySelectorAll<HTMLElement>('.line-word')];
        return words.map((word) => ({ word, top: word.offsetTop }));
    });
    for (const plan of plans) {
        const lines = [...new Set(plan.map((entry) => entry.top))].sort((first, second) => first - second);
        for (const { word, top } of plan) {
            word.style.setProperty(LINE_PROPERTY, String(lines.indexOf(top)));
        }
    }
};

/**
 * Gives each word of a line-revealed heading the index of the line it sits on (LD-29), as a custom property CSS turns
 * into a delay (LD-45: `setProperty` passes the CSP). A resize can rewrap a heading, so the indices follow it.
 */
export const revealHeadingLines = (): void => {
    const headings = [...document.querySelectorAll<HTMLElement>('.line-reveal')];
    if (headings.length === 0) {
        return;
    }
    const observer = new ResizeObserver(() => {
        indexLines(headings);
    });
    for (const heading of headings) {
        observer.observe(heading);
    }
};
