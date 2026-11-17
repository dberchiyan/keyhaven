import { expect, test } from '@playwright/test';

import { signIn, signOut, TENANT_EMAIL } from './session';

test('a visitor browses the catalogue and opens a home', async ({ page }) => {
    await page.goto('/browse');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const firstHome = page
        .getByRole('region', { name: 'Homes' })
        .getByRole('link', { name: /^Open / })
        .first();
    await firstHome.click();
    await expect(page).toHaveURL(/\/listings\/[0-9a-f-]{36}/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a tenant signs in, lands on the catalogue and signs out', async ({ page }) => {
    await signIn(page, TENANT_EMAIL);
    await expect(page).toHaveURL(/\/browse/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await signOut(page);
});
