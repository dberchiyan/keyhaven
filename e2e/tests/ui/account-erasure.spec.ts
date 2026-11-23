import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { createFixtures, type Fixtures, PASSWORD } from '../../support/db';
import { signIn } from '../../support/session';

const UNAUTHORIZED = 401;

test.describe.configure({ mode: 'serial' });

let f: Fixtures;

test.beforeAll(async () => {
    f = await createFixtures(`ui-erasure-${randomUUID().slice(0, 8)}`);
});

test('a tenant deletes their account: the review step, a wrong password on the field, then the erasure signs them out', async ({
    page,
}) => {
    await signIn(page, f.tenant.email);
    await page.goto('/settings/account');
    await page.getByRole('button', { name: 'Delete account' }).click();

    const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
    await expect(dialog).toContainText('This can’t be undone.');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Continue' }).click();

    const password = dialog.getByRole('textbox', { name: 'Password' });
    await expect(password).toBeFocused();
    await password.fill('Not-The-Password-1!');
    await dialog.getByRole('button', { name: 'Delete my account' }).click();
    await expect(dialog.getByText('The current password is not right')).toBeVisible();
    await expect(password).toBeFocused();
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    expect((await page.request.get('/api/v1/auth/me')).status()).toBe(200);

    await password.fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Delete my account' }).click();
    await expect.poll(async () => (await page.request.get('/api/v1/auth/me')).status()).toBe(UNAUTHORIZED);
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(f.tenant.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login/);
    expect((await page.request.get('/api/v1/auth/me')).status()).toBe(UNAUTHORIZED);
});
