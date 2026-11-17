import { expect, test } from '@playwright/test';

import { createFixtures } from '../../support/db';
import { signIn, signOut } from '../../support/session';

const RUN_SUFFIX_LENGTH = 6;
const BASE36 = 36;

test('a landlord creates a draft listing and edits it', async ({ page }) => {
    const suffix = Date.now().toString(BASE36).slice(-RUN_SUFFIX_LENGTH);
    const title = `Smoke test loft ${suffix}`;
    const f = await createFixtures('ui-editor');
    await signIn(page, f.landlord.email);

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
