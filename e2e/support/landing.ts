import { expect, type Locator, type Page } from '@playwright/test';

import { DEMO } from '../../landing/src/content/site';

export const VIEWPORTS = [
    { name: 'desktop', size: { width: 1440, height: 900 } },
    { name: 'phone', size: { width: 375, height: 812 } },
] as const;

const LONG_DASHES = /[–—]/u;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/giu;
const OWN_HOSTS = ['osdb.io'];

export interface JsonLdNode {
    '@type'?: string;
    sameAs?: string[];
    itemListElement?: { item?: string; name?: string }[];
}

/** `{city}` → the value, as the landing's own `fill` does for its copy. */
export const fillCopy = (template: string, values: Record<string, string>): string =>
    template.replace(/\{(\w+)\}/gu, (match, key: string) => values[key] ?? match);

/** A two-part heading of the landing's content (`start` + `accent`) as the page renders it. */
export const headingOf = (title: { start: string; accent: string }): string => `${title.start} ${title.accent}`;

/**
 * The page as served, before any script ran: one `<h1>`, no `style` attribute (LD-45; a script may still set custom
 * properties at run time), and no forbidden string anywhere in it, attributes and JSON-LD included.
 */
export const expectMarkupRules = async (page: Page, path: string): Promise<void> => {
    const html = await (await page.request.get(path)).text();
    expect(html.match(/<h1[\s>]/gu)).toHaveLength(1);
    expect(html).not.toMatch(/<[^>]+\sstyle=/u);
    expect(html).not.toMatch(LONG_DASHES);
    for (const host of OWN_HOSTS) {
        expect(html).not.toContain(host);
    }
    const demoEmails: readonly string[] = DEMO.accounts.map((account) => account.email);
    const strangers = [...html.matchAll(EMAIL)].map(([email]) => email).filter((email) => !demoEmails.includes(email));
    expect(strangers).toEqual([]);
};

/** The top-level JSON-LD nodes: each script's object, or the members of its `@graph`. */
export const jsonLdNodes = async (page: Page): Promise<JsonLdNode[]> => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    return blocks.flatMap((block) => {
        const parsed = JSON.parse(block) as JsonLdNode & { '@graph'?: JsonLdNode[] };
        return parsed['@graph'] ?? [parsed];
    });
};

/** LD-39 on every page: one `Organization` with its profiles, never a `FAQPage`. */
export const expectOrganization = (nodes: JsonLdNode[], sameAs: readonly string[]): void => {
    expect(nodes.filter((node) => node['@type'] === 'Organization')).toEqual([
        expect.objectContaining({ sameAs: [...sameAs] }),
    ]);
    expect(nodes.map((node) => node['@type'])).not.toContain('FAQPage');
};

const hasHorizontalScroll = (page: Page): Promise<boolean> =>
    page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

const effectiveOpacity = (heading: Locator): Promise<number> =>
    heading.evaluate((element) => {
        let opacity = 1;
        for (let current: Element | null = element; current; current = current.parentElement) {
            opacity *= Number(getComputedStyle(current).opacity);
        }
        return opacity;
    });

/**
 * Scrolls the whole page down one viewport at a time with instant jumps (LD-49), letting two frames pass after each so
 * the observers and scroll timelines see every position; then every heading must be fully visible and nothing may
 * stick out sideways.
 */
export const expectHeadingsVisibleAfterScrolling = async (page: Page): Promise<void> => {
    expect(await hasHorizontalScroll(page)).toBe(false);
    for (;;) {
        const isAtEnd = await page.evaluate(async () => {
            window.scrollBy({ top: window.innerHeight, behavior: 'instant' });
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
            return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
        });
        if (isAtEnd) {
            break;
        }
    }
    const headings = page.getByRole('heading');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
        const heading = headings.nth(index);
        await expect(heading).toBeVisible();
        await expect.poll(() => effectiveOpacity(heading), { message: await heading.innerText() }).toBe(1);
    }
    expect(await hasHorizontalScroll(page)).toBe(false);
};
