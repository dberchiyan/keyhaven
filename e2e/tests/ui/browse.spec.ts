import { expect, test } from '@playwright/test';

import { createFixtures, type Fixtures } from '../../support/db';
import { signIn, signOut } from '../../support/session';

let f: Fixtures;

test.beforeAll(async () => {
    f = await createFixtures('ui-browse');
});

test('a visitor browses the catalogue and opens a home', async ({ page }) => {
    await page.goto('/browse?city=testville');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page
        .getByRole('region', { name: 'Homes' })
        .getByRole('link', { name: /^Open / })
        .first()
        .click();
    await expect(page).toHaveURL(/\/listings\/[0-9a-f-]{36}/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a tenant signs in, lands on the catalogue and signs out', async ({ page }) => {
    await signIn(page, f.tenant.email);
    await expect(page).toHaveURL(/\/browse/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await signOut(page);
});
