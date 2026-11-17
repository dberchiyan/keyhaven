import { expect, type Page } from '@playwright/test';

export const DEMO_PASSWORD = 'Keyhaven-Demo-2026!';
export const TENANT_EMAIL = 'maya.lopez@keyhaven.example';
export const LANDLORD_EMAIL = 'daniel.reyes@keyhaven.example';
const UNAUTHORIZED = 401;

/** Signs in through the form, as a person would, and waits for the app to leave the sign-in page. */
export async function signIn(page: Page, email: string): Promise<void> {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/\/login/);
}

/** Ends the session on the server, so a smoke run leaves no live session behind in the database it ran against. */
export async function signOut(page: Page): Promise<void> {
    const xsrf = (await page.context().cookies()).find((cookie) => cookie.name === 'XSRF-TOKEN')?.value ?? '';
    const response = await page.request.post('/api/v1/auth/logout', { headers: { 'X-XSRF-TOKEN': xsrf } });
    expect(response.ok()).toBe(true);
    expect((await page.request.get('/api/v1/auth/me')).status()).toBe(UNAUTHORIZED);
}
