import { expect, test } from '@playwright/test';

import { LANDLORD_EMAIL, signIn, signOut } from './session';

const RUN_SUFFIX_LENGTH = 6;
const BASE36 = 36;

test.skip(!process.env.E2E_WRITES, 'Creates a listing: runs only where writes are allowed (CI sets E2E_WRITES).');

test('a landlord creates a draft listing and edits it', async ({ page }) => {
    const suffix = Date.now().toString(BASE36).slice(-RUN_SUFFIX_LENGTH);
    const title = `Smoke test loft ${suffix}`;
    await signIn(page, LANDLORD_EMAIL);

    await page.goto('/manage/new');
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Description').fill('A quiet loft created by the smoke test, with a long balcony.');
    await page.getByLabel('Monthly rent').fill('2150');
    await page.getByLabel('Bedrooms').fill('2');
    await page.getByLabel('Bathrooms').fill('1.5');
    await page.getByLabel('Size, sq ft').fill('980');
    await page.getByLabel('Available from').fill('2027-01-15');
    await page.getByLabel('Street address').fill('77 Smoke Lane');
    await page.getByLabel('City').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('ZIP').fill('78701');
    await page.getByRole('button', { name: 'Create listing' }).click();

    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await page.getByRole('link', { name: /edit/i }).first().click();
    await page.getByLabel('Title').fill(`${title} (edited)`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { level: 1, name: `${title} (edited)` })).toBeVisible();

    await signOut(page);
});
