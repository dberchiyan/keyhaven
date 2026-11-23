import { expect, type Page, test } from '@playwright/test';

import { CHROME } from '../../../landing/src/content/chrome';
import { LANDING } from '../../../landing/src/content/landing';
import { PROOF_FIGURES } from '../../../landing/src/content/proof';
import { SEARCH_DEMO } from '../../../landing/src/content/search-demo';
import { CITIES, DEMO, demoSignInHref, SITE } from '../../../landing/src/content/site';
import {
    expectHeadingsVisibleAfterScrolling,
    expectMarkupRules,
    expectOrganization,
    fillCopy,
    headingOf,
    jsonLdNodes,
    VIEWPORTS,
} from '../../support/landing';

const NEW_TAB = ` ${CHROME.newTab}`;

const expectLinks = async (
    page: Page,
    region: string,
    links: readonly { label: string; href: string }[],
): Promise<void> => {
    const scope = page.getByRole('region', { name: region });
    for (const link of links) {
        await expect(scope.getByRole('link', { name: link.label, exact: true })).toHaveAttribute('href', link.href);
    }
};

/** On a phone the Rent | Buy switch shows one card at a time; a card's link is checked with its own option chosen. */
const expectPathLinks = async (page: Page, isPhone: boolean): Promise<void> => {
    const region = page.getByRole('region', { name: headingOf(LANDING.paths.title) });
    for (const card of LANDING.paths.cards) {
        if (isPhone) {
            await region.getByRole('radio', { name: card.title, exact: true }).focus();
            await page.keyboard.press('Space');
        }
        await expect(region.getByRole('link', { name: card.cta.label, exact: true })).toHaveAttribute(
            'href',
            card.cta.href,
        );
    }
};

const isTargetInView = (page: Page, id: string): Promise<boolean> =>
    page.evaluate((target) => {
        const box = document.getElementById(target)?.getBoundingClientRect();
        return box !== undefined && box.top >= 0 && box.top < window.innerHeight;
    }, id);

for (const viewport of VIEWPORTS) {
    test.describe(`home page, ${viewport.name}`, () => {
        test.describe.configure({ mode: 'serial' });
        test.use({ viewport: viewport.size });

        test.beforeEach(async ({ page }) => {
            await page.goto('/');
        });

        test('one h1, the JSON-LD of the home page and clean markup', async ({ page }) => {
            await expect(page.getByRole('heading', { level: 1 })).toHaveText(headingOf(LANDING.hero.title));
            await expect(page).toHaveTitle(LANDING.meta.title);
            const nodes = await jsonLdNodes(page);
            expectOrganization(nodes, SITE.sameAs);
            expect(nodes.filter((node) => node['@type'] === 'WebSite')).toHaveLength(1);
            expect(nodes.map((node) => node['@type'])).not.toContain('BreadcrumbList');
            await expectMarkupRules(page, '/');
        });

        test('every heading shows after scrolling the whole page, and nothing scrolls sideways', async ({ page }) => {
            await expectHeadingsVisibleAfterScrolling(page);
        });

        test('every call to action points where the content says', async ({ page }) => {
            const header = page.getByRole('banner');
            if (viewport.name === 'desktop') {
                await expect(header.getByRole('link', { name: CHROME.header.primary })).toHaveAttribute(
                    'href',
                    SITE.links.browse,
                );
            }
            await expect(header.getByRole('link', { name: CHROME.header.homeLabel })).toHaveAttribute('href', '/');
            await expectLinks(
                page,
                headingOf(LANDING.hero.title),
                CITIES.map((city) => ({ label: `${city.name}, ${city.state}`, href: `/rent/${city.slug}` })),
            );
            const cities = page.getByRole('region', { name: headingOf(LANDING.cities.title) });
            const rentLinks = cities.getByRole('link', { name: LANDING.cities.rent, exact: true });
            const buyLinks = cities.getByRole('link', { name: LANDING.cities.buy, exact: true });
            for (const [index, city] of CITIES.entries()) {
                await expect(rentLinks.nth(index)).toHaveAttribute('href', `/rent/${city.slug}`);
                await expect(buyLinks.nth(index)).toHaveAttribute('href', `/buy/${city.slug}`);
            }
            await expect(rentLinks).toHaveCount(CITIES.length);
            await expectPathLinks(page, viewport.name === 'phone');
            await expectLinks(page, headingOf(LANDING.owners.title), [
                { label: LANDING.owners.primary, href: SITE.links.signUp },
                { label: LANDING.owners.secondary, href: SITE.links.signIn },
            ]);
            await expectLinks(page, headingOf(LANDING.cta.title), [
                { label: LANDING.cta.secondary, href: SITE.links.signUp },
                { label: `${LANDING.cta.source}${NEW_TAB}`, href: SITE.links.github },
            ]);
            const source = page
                .getByRole('region', { name: headingOf(LANDING.cta.title) })
                .getByRole('link', { name: `${LANDING.cta.source}${NEW_TAB}` });
            await expect(source).toHaveAttribute('target', '_blank');
            await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
        });

        test('the proof strip shows the catalogue figures, each linking to its page', async ({ page }) => {
            const strip = page.getByRole('navigation', { name: LANDING.proof.label });
            await expect(strip.getByRole('link')).toHaveCount(PROOF_FIGURES.length);
            for (const figure of PROOF_FIGURES) {
                await expect(
                    strip.getByRole('link', { name: `${figure.value} ${figure.caption}`, exact: true }),
                ).toHaveAttribute('href', figure.href);
            }
        });

        test('each search scenario opens the catalogue with its filters', async ({ page }) => {
            const scenarios = page.getByRole('navigation', { name: LANDING.scenarios.title });
            await expect(scenarios.getByRole('link')).toHaveCount(LANDING.scenarios.items.length);
            for (const item of LANDING.scenarios.items) {
                await expect(
                    scenarios.getByRole('link', { name: `${item.kind} ${item.label}`, exact: true }),
                ).toHaveAttribute('href', item.href);
            }
        });

        test('the closing panel offers a choice card per path into the catalogue', async ({ page }) => {
            const choices = page
                .getByRole('region', { name: headingOf(LANDING.cta.title) })
                .getByRole('list', { name: LANDING.cta.choicesLabel });
            await expect(choices.getByRole('link')).toHaveCount(LANDING.cta.choices.length);
            for (const choice of LANDING.cta.choices) {
                await expect(
                    choices.getByRole('link', { name: `${choice.title} ${choice.text}`, exact: true }),
                ).toHaveAttribute('href', choice.href);
            }
        });

        test('each demo card signs in as its account with the address filled in', async ({ page }) => {
            const demo = page.getByRole('region', { name: headingOf(LANDING.demo.title) });
            for (const account of DEMO.accounts) {
                await expect(
                    demo.getByRole('link', {
                        name: fillCopy(LANDING.demo.signInAs, { name: account.firstName }),
                        exact: true,
                    }),
                ).toHaveAttribute('href', demoSignInHref(account));
            }
        });

        test('the footer links to the catalogue, the city pages, the company and the legal pages', async ({ page }) => {
            const footer = page.getByRole('contentinfo');
            const { footer: copy } = CHROME;
            const expected = [
                ...copy.browseLinks,
                ...CITIES.map((city) => ({ label: city.name, href: `/rent/${city.slug}` })),
                { label: copy.about, href: '/#how-it-works' },
                { label: CHROME.header.listHome, href: SITE.links.signUp },
                { label: `${copy.github}${NEW_TAB}`, href: SITE.links.github },
                { label: copy.privacy, href: SITE.links.privacy },
                { label: copy.terms, href: SITE.links.terms },
                { label: copy.signIn, href: SITE.links.signIn },
            ];
            for (const link of expected) {
                await expect(footer.getByRole('link', { name: link.label, exact: true })).toHaveAttribute(
                    'href',
                    link.href,
                );
            }
        });

        test('the hero film pauses and replays from its controls', async ({ page }) => {
            const film = page.getByRole('img', { name: SEARCH_DEMO.label });
            const pause = page.getByRole('button', { name: SEARCH_DEMO.controls.pause, exact: true });
            await pause.focus();
            await expect(pause).toHaveAttribute('aria-pressed', 'false');
            await page.keyboard.press('Enter');
            const play = page.getByRole('button', { name: SEARCH_DEMO.controls.play, exact: true });
            await expect(play).toHaveAttribute('aria-pressed', 'true');
            await expect(film).toHaveAttribute('data-paused', '');

            await page.getByRole('button', { name: SEARCH_DEMO.controls.replay, exact: true }).focus();
            await page.keyboard.press('Enter');
            await expect(pause).toHaveAttribute('aria-pressed', 'false');
            await expect(film).not.toHaveAttribute('data-paused');
            await expect(film).toHaveAttribute('data-visible', '');
        });

        test('the demo section copies each account and the password', async ({ page, context }) => {
            await context.grantPermissions(['clipboard-read', 'clipboard-write']);
            const demo = page.getByRole('region', { name: headingOf(LANDING.demo.title) });
            const values = [
                ...DEMO.accounts.map((account) => ({
                    name: fillCopy(LANDING.demo.copyEmail, { email: account.email }),
                    value: account.email,
                })),
                { name: LANDING.demo.copyPassword, value: DEMO.password },
            ];
            for (const { name, value } of values) {
                const button = demo.getByRole('button', { name });
                await button.focus();
                await page.keyboard.press('Enter');
                await expect(demo.getByText(fillCopy(LANDING.demo.copiedStatus, { value }))).toBeAttached();
                expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(value);
            }
            await expect(demo.getByRole('button', { name: LANDING.demo.copyPassword })).toContainText(
                LANDING.demo.copied,
            );
        });
    });
}

test.describe('home page, desktop sections nav', () => {
    test.use({ viewport: VIEWPORTS[0].size, reducedMotion: 'reduce' });

    /** Reduced motion turns the page's smooth scrolling into instant jumps (LD-49): a jump still under way swallowed the next one. */
    test('each anchor of the header leads to its section', async ({ page }) => {
        await page.goto('/');
        await expect(
            page.getByRole('banner').getByRole('link', { name: CHROME.header.signIn, exact: true }),
        ).toHaveAttribute('href', SITE.links.signIn);
        const nav = page.getByRole('banner').getByRole('navigation', { name: CHROME.header.sectionsLabel });
        for (const anchor of CHROME.header.anchors) {
            const link = nav.getByRole('link', { name: anchor.label, exact: true });
            await expect(link).toHaveAttribute('href', anchor.href);
            await link.focus();
            await page.keyboard.press('Enter');
            const id = anchor.href.replace('/#', '');
            await expect(page).toHaveURL(new RegExp(`#${id}$`, 'u'));
            await expect.poll(() => isTargetInView(page, id), { message: anchor.href }).toBe(true);
        }
    });
});

test.describe('home page, phone menu', () => {
    test.use({ viewport: VIEWPORTS[1].size });

    test('the menu opens by keyboard, lists the sections and the account links, and closes on a link', async ({
        page,
    }) => {
        await page.goto('/');
        await expect(page.getByRole('navigation', { name: CHROME.header.sectionsLabel })).toBeHidden();
        const open = page.getByRole('banner').getByRole('button', { name: CHROME.header.openMenu });
        await open.focus();
        await page.keyboard.press('Enter');
        const nav = page.getByRole('navigation', { name: CHROME.header.sectionsLabel });
        await expect(nav).toBeVisible();
        for (const anchor of CHROME.header.anchors) {
            await expect(nav.getByRole('link', { name: anchor.label, exact: true })).toHaveAttribute(
                'href',
                anchor.href,
            );
        }
        for (const link of await page.getByRole('link', { name: CHROME.header.listHome, exact: true }).all()) {
            await expect(link).toHaveAttribute('href', SITE.links.signUp);
        }

        await page.getByRole('button', { name: CHROME.header.closeMenu }).focus();
        await page.keyboard.press('Enter');
        await expect(nav).toBeHidden();

        await open.focus();
        await page.keyboard.press('Enter');
        const last = CHROME.header.anchors.at(-1);
        if (!last) {
            throw new Error('The header has no anchors');
        }
        await nav.getByRole('link', { name: last.label, exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(nav).toBeHidden();
        await expect(page).toHaveURL(new RegExp(`${last.href.replace('/', '')}$`, 'u'));
    });
});

test.describe('home page, phone Rent | Buy switch', () => {
    test.use({ viewport: VIEWPORTS[1].size });

    test('the switch shows one path at a time and works by keyboard', async ({ page }) => {
        await page.goto('/');
        const region = page.getByRole('region', { name: headingOf(LANDING.paths.title) });
        const [rent, buy] = LANDING.paths.cards;
        if (!rent || !buy) {
            throw new Error('The paths section needs a renting and a buying card');
        }
        const group = region.getByRole('radiogroup', { name: LANDING.paths.switchLabel });
        const rentOption = group.getByRole('radio', { name: rent.title, exact: true });
        const buyOption = group.getByRole('radio', { name: buy.title, exact: true });
        const rentLink = region.getByRole('link', { name: rent.cta.label, exact: true });
        const buyLink = region.getByRole('link', { name: buy.cta.label, exact: true });
        await expect(rentOption).toBeChecked();
        await expect(rentLink).toBeVisible();
        await expect(buyLink).toBeHidden();

        await rentOption.focus();
        await page.keyboard.press('ArrowRight');
        await expect(buyOption).toBeChecked();
        await expect(buyOption).toBeFocused();
        await expect(buyLink).toBeVisible();
        await expect(rentLink).toBeHidden();

        await page.keyboard.press('ArrowLeft');
        await expect(rentOption).toBeChecked();
        await expect(rentLink).toBeVisible();
        await expect(buyLink).toBeHidden();
    });

    test('from a tablet width both paths stand side by side without the switch', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        const region = page.getByRole('region', { name: headingOf(LANDING.paths.title) });
        await expect(region.getByRole('radiogroup', { name: LANDING.paths.switchLabel })).toBeHidden();
        for (const card of LANDING.paths.cards) {
            await expect(region.getByRole('link', { name: card.cta.label, exact: true })).toBeVisible();
        }
    });
});

test.describe('home page, phone dock', () => {
    test.use({ viewport: VIEWPORTS[1].size });

    test('the dock with the primary action appears after the hero, opens the menu and hides at the closing panel', async ({
        page,
    }) => {
        await page.goto('/');
        const dock = page.getByRole('navigation', { name: CHROME.header.dockLabel });
        await expect(dock).toHaveAttribute('inert', '');
        await expect(page.getByRole('banner').getByRole('link', { name: CHROME.header.primary })).toBeHidden();

        await page.locator('#rent-or-buy').evaluate((section) => {
            section.scrollIntoView({ behavior: 'instant' });
        });
        await expect(dock).not.toHaveAttribute('inert', '');
        await expect(dock.getByRole('link', { name: CHROME.header.primary })).toHaveAttribute(
            'href',
            SITE.links.browse,
        );
        await dock.getByRole('button', { name: CHROME.header.openMenu }).focus();
        await page.keyboard.press('Enter');
        const nav = page.getByRole('navigation', { name: CHROME.header.sectionsLabel });
        await expect(nav).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(nav).toBeHidden();

        await page.getByRole('heading', { name: headingOf(LANDING.cta.title) }).evaluate((heading) => {
            heading.scrollIntoView({ behavior: 'instant' });
        });
        await expect(dock).toHaveAttribute('inert', '');
    });
});
