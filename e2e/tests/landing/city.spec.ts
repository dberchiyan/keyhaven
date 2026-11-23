import { expect, test } from '@playwright/test';

import { CITY_PAGE } from '../../../landing/src/content/city-page';
import { CITIES, SITE } from '../../../landing/src/content/site';
import {
    expectHeadingsVisibleAfterScrolling,
    expectMarkupRules,
    expectOrganization,
    fillCopy,
    jsonLdNodes,
    VIEWPORTS,
} from '../../support/landing';

const KINDS = ['RENT', 'SALE'] as const;

for (const viewport of VIEWPORTS) {
    test.describe(`city pages, ${viewport.name}`, () => {
        test.describe.configure({ mode: 'serial' });
        test.use({ viewport: viewport.size });

        for (const city of CITIES) {
            for (const kind of KINDS) {
                const copy = CITY_PAGE.kinds[kind];
                const other = CITY_PAGE.kinds[kind === 'RENT' ? 'SALE' : 'RENT'];
                const path = `/${copy.segment}/${city.slug}`;
                const title = fillCopy(copy.title, { city: `${city.name}, ${city.state}` });

                test(`${path}: heading, breadcrumbs, JSON-LD, links and markup`, async ({ page }) => {
                    await page.goto(path);
                    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
                    await expect(page).toHaveTitle(fillCopy(copy.metaTitle, { city: `${city.name}, ${city.state}` }));

                    const nodes = await jsonLdNodes(page);
                    expectOrganization(nodes, SITE.sameAs);
                    const types = nodes.map((node) => node['@type']);
                    expect(types).not.toContain('WebSite');
                    expect(types).toContain('CollectionPage');
                    const crumbs = nodes.find((node) => node['@type'] === 'BreadcrumbList')?.itemListElement ?? [];
                    expect(crumbs.map((crumb) => crumb.name)).toEqual([expect.any(String), title]);
                    expect(crumbs.at(-1)?.item).toMatch(new RegExp(`${path}$`, 'u'));

                    const trail = page.getByRole('navigation', { name: CITY_PAGE.breadcrumb });
                    await expect(trail.getByRole('link', { name: copy.crumb, exact: true })).toHaveAttribute(
                        'href',
                        copy.crumbHref,
                    );
                    await expect(page.getByRole('link', { name: copy.switchTo, exact: true })).toHaveAttribute(
                        'href',
                        `/${other.segment}/${city.slug}`,
                    );
                    const browse = `${SITE.links.browse}?kind=${copy.browseKind}&city=${city.slug}`;
                    const openAll = page.getByRole('link', {
                        name: new RegExp(`^${fillCopy(CITY_PAGE.openAll, { count: '[\\d,]+' })}$`, 'u'),
                    });
                    await expect(openAll).toHaveAttribute('href', browse);

                    await expectMarkupRules(page, path);
                    await expectHeadingsVisibleAfterScrolling(page);
                });
            }
        }
    });
}
