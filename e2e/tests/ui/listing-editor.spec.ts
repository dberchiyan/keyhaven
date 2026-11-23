import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { createFixtures, type Fixtures, listingTitle } from '../../support/db';
import { signIn, signOut } from '../../support/session';

test.describe.configure({ mode: 'serial' });

let f: Fixtures;

test.beforeAll(async () => {
    f = await createFixtures(`ui-editor-${randomUUID().slice(0, 8)}`);
});

test('a landlord creates a draft listing and edits it', async ({ page }) => {
    const title = `Smoke test loft ${f.run}`;
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
    await page.getByRole('option', { name: /^Testville/ }).click();
    await page.getByLabel('ZIP').fill('78701');
    await page.getByRole('button', { name: 'Create listing' }).click();

    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await page.getByRole('link', { name: 'Edit details' }).click();
    await page.getByLabel('Title').fill(`${title} (edited)`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { level: 1, name: `${title} (edited)` })).toBeVisible();

    await signOut(page);
});

test('a landlord publishes a draft with a photo and takes it off the site again', async ({ page }) => {
    await signIn(page, f.landlord.email);
    await page.goto(`/manage/${f.landlordDraft}`);
    await expect(page.getByRole('heading', { level: 1, name: listingTitle(f.run, 'landlordDraft') })).toBeVisible();
    const actions = page.getByRole('region', { name: 'Actions' });

    await actions.getByRole('button', { name: 'Publish' }).click();
    await expect(actions.getByText('Published — tenants can now find it.')).toBeVisible();
    await actions.getByRole('button', { name: 'Unpublish' }).click();
    await expect(actions.getByText('Taken off the site.')).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Publish' })).toBeVisible();

    await signOut(page);
});
