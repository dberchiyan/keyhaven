import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { createFixtures, type Fixtures, listingTitle } from '../../support/db';
import { signIn, signOut } from '../../support/session';

test.describe.configure({ mode: 'serial' });

let f: Fixtures;

test.beforeAll(async () => {
    f = await createFixtures(`ui-moderation-${randomUUID().slice(0, 8)}`);
});

test('an admin suspends a listing after the review step; Cancel is focused first and gives the focus back', async ({
    page,
}) => {
    await signIn(page, f.admin.email);
    await page.goto(`/manage/${f.otherLandlordPublished}`);
    await expect(
        page.getByRole('heading', { level: 1, name: listingTitle(f.run, 'otherLandlordPublished') }),
    ).toBeVisible();
    const actions = page.getByRole('region', { name: 'Actions' });
    const suspend = actions.getByRole('button', { name: 'Suspend listing' });

    await suspend.click();
    const review = page.getByRole('dialog', { name: 'Suspend this listing?' });
    await expect(review).toContainText(listingTitle(f.run, 'otherLandlordPublished'));
    await expect(review.getByRole('button', { name: 'Keep it published' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(review).toBeHidden();
    await expect(suspend).toBeFocused();

    await suspend.click();
    await review.getByRole('button', { name: 'Suspend listing' }).click();
    await expect(review).toBeHidden();
    await expect(actions.getByText('Suspended — the owner cannot publish it again.')).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Suspend listing' })).toBeHidden();

    await signOut(page);
});
