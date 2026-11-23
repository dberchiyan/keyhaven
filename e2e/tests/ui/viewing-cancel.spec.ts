import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, listingTitle, PASSWORD } from '../../support/db';
import { signIn, signOut } from '../../support/session';

const HOURS = {
    slotMinutes: 30,
    noticeHours: 0,
    horizonDays: 14,
    windows: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: 8 * 60, end: 20 * 60 })),
    blockedDays: [],
    version: null,
};

test.describe.configure({ mode: 'serial' });

const clients = new ClientPool();
let f: Fixtures;

test.beforeAll(async () => {
    f = await createFixtures(`ui-viewing-${randomUUID().slice(0, 8)}`);
    const landlord = await clients.signedIn(f.landlord.email, PASSWORD);
    const tenant = await clients.signedIn(f.tenant.email, PASSWORD);
    expect((await landlord.put(`/api/v1/managed-listings/${f.landlordPublished}/viewing-schedule`, HOURS)).status).toBe(
        200,
    );
    const slots = await tenant.get(`/api/v1/listings/${f.landlordPublished}/viewing-slots?days=5`);
    const days = slots.body.days as { slots: { startsAt: string }[] }[];
    const requested = await tenant.postIdempotent('/api/v1/viewings', {
        listingId: f.landlordPublished,
        startsAt: days[2]?.slots[0]?.startsAt,
    });
    expect(requested.status).toBe(200);
});

test.afterAll(async () => {
    await clients.disposeAll();
});

test('a tenant cancels their viewing after the review step; Back is focused first', async ({ page }) => {
    await signIn(page, f.tenant.email);
    await page.goto('/viewings');
    await expect(page.getByRole('heading', { level: 1, name: 'My viewings' })).toBeVisible();
    await expect(page.getByText(listingTitle(f.run, 'landlordPublished'))).toBeVisible();
    const cancel = page.getByRole('button', { name: 'Cancel viewing' });

    await cancel.click();
    const review = page.getByRole('dialog', { name: 'Cancel this viewing?' });
    await expect(review.getByRole('button', { name: 'Back' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(review).toBeHidden();

    await cancel.click();
    await review.getByRole('textbox', { name: 'A note for the other side (optional)' }).fill('Found a place, thanks.');
    await review.getByRole('button', { name: 'Cancel viewing' }).click();
    await expect(review).toBeHidden();
    await expect(page.getByText('Cancelled', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel viewing' })).toBeHidden();

    await signOut(page);
});
