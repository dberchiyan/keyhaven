import { expect, test } from '@playwright/test';

import { CHROME } from '../../../landing/src/content/chrome';
import { type LegalPage, NOT_FOUND, PRIVACY, TERMS } from '../../../landing/src/content/legal';
import { SITE } from '../../../landing/src/content/site';
import {
    expectHeadingsVisibleAfterScrolling,
    expectMarkupRules,
    expectOrganization,
    jsonLdNodes,
    VIEWPORTS,
} from '../../support/landing';

const NOT_FOUND_STATUS = 404;
const UNKNOWN_PATH = '/no-such-page';

const LEGAL_PAGES: readonly { path: string; page: LegalPage }[] = [
    { path: SITE.links.privacy, page: PRIVACY },
    { path: SITE.links.terms, page: TERMS },
];

for (const viewport of VIEWPORTS) {
    test.describe(`legal pages and 404, ${viewport.name}`, () => {
        test.describe.configure({ mode: 'serial' });
        test.use({ viewport: viewport.size });

        for (const { path, page: legal } of LEGAL_PAGES) {
            test(`${path}: heading, sections, breadcrumbs and markup`, async ({ page }) => {
                await page.goto(path);
                await expect(page.getByRole('heading', { level: 1 })).toHaveText(legal.heading);
                await expect(page).toHaveTitle(legal.metaTitle);
                for (const section of legal.sections) {
                    await expect(page.getByRole('heading', { level: 2, name: section.title })).toBeVisible();
                    if (section.link) {
                        await expect(
                            page.getByRole('main').getByRole('link', {
                                name: `${section.link.label} ${CHROME.newTab}`,
                                exact: true,
                            }),
                        ).toHaveAttribute('href', section.link.href);
                    }
                }
                const nodes = await jsonLdNodes(page);
                expectOrganization(nodes, SITE.sameAs);
                expect(nodes.map((node) => node['@type'])).not.toContain('WebSite');
                const crumbs = nodes.find((node) => node['@type'] === 'BreadcrumbList')?.itemListElement ?? [];
                expect(crumbs.map((crumb) => crumb.name)).toEqual([expect.any(String), legal.heading]);

                await expectMarkupRules(page, path);
                await expectHeadingsVisibleAfterScrolling(page);
            });
        }

        test('an unknown address answers 404 with the not-found page, kept out of the index', async ({ page }) => {
            const response = await page.goto(UNKNOWN_PATH);
            expect(response?.status()).toBe(NOT_FOUND_STATUS);
            await expect(page.getByRole('heading', { level: 1 })).toHaveText(NOT_FOUND.heading);
            await expect(page).toHaveTitle(NOT_FOUND.metaTitle);
            const main = page.getByRole('main');
            for (const link of NOT_FOUND.links) {
                await expect(main.getByRole('link', { name: link.label, exact: true })).toHaveAttribute(
                    'href',
                    link.href,
                );
            }
            const nodes = await jsonLdNodes(page);
            expectOrganization(nodes, SITE.sameAs);
            expect(nodes.map((node) => node['@type'])).not.toContain('BreadcrumbList');
            await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

            await expectMarkupRules(page, UNKNOWN_PATH);
            await expectHeadingsVisibleAfterScrolling(page);
        });
    });
}
