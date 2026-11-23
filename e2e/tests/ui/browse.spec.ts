import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { createFixtures, type Fixtures, listingTitle, PASSWORD } from '../../support/db';
import { signIn, signOut } from '../../support/session';

test.describe.configure({ mode: 'serial' });

let f: Fixtures;

test.beforeAll(async () => {
    f = await createFixtures(`ui-browse-${randomUUID().slice(0, 8)}`);
});

test('a visitor browses the catalogue and opens a home', async ({ page }) => {
    const title = listingTitle(f.run, 'landlordPublished');
    await page.goto('/browse?city=testville');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page
        .getByRole('region', { name: 'Homes' })
        .getByRole('link', { name: `Open ${title}` })
        .click();
    await expect(page).toHaveURL(/\/listings\/[0-9a-f-]{36}/);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
});

test('a tenant signs in, lands on the catalogue and signs out', async ({ page }) => {
    await signIn(page, f.tenant.email);
    await expect(page).toHaveURL(/\/browse/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await signOut(page);
});

test('a link naming the account fills the email and focuses the password; a malformed one is ignored', async ({
    page,
}) => {
    await page.goto(`/login?email=${encodeURIComponent(f.tenant.email)}`);
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(f.tenant.email);
    const password = page.getByRole('textbox', { name: 'Password' });
    await expect(password).toBeFocused();
    await password.fill(PASSWORD);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/browse/);
    await signOut(page);

    await page.goto('/login?email=not-an-address');
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('');
});
