import { expect, type Page } from '@playwright/test';

import { PASSWORD } from './db';

const UNAUTHORIZED = 401;

/** Signs in through the form, as a person would, and waits for the app to leave the sign-in page. */
export async function signIn(page: Page, email: string): Promise<void> {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/\/login/);
}

/** Signs out through the account menu (E2E-13) and checks the session is gone on the server too. */
export async function signOut(page: Page): Promise<void> {
    await page.getByRole('button', { name: /^Account menu for / }).click();
    await page.getByRole('dialog').getByRole('menuitem', { name: 'Sign out' }).click();
    await expect.poll(async () => (await page.request.get('/api/v1/auth/me')).status()).toBe(UNAUTHORIZED);
}
