import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { ClientPool } from '../../support/client';
import { createFixtures, type Fixtures, PASSWORD } from '../../support/db';
import { allEmails, lastEmailTo, tokenOf } from '../../support/mailbox';

const NEW_PASSWORD = 'Brand-New-Password-2026!';

test.describe.configure({ mode: 'serial' });

const clients = new ClientPool();
let f: Fixtures;

test.beforeAll(async () => {
    f = await createFixtures(`account-${randomUUID().slice(0, 8)}`);
});

test.afterAll(async () => {
    await clients.disposeAll();
});

test('registers a landlord, signs them in and sends the verification link', async () => {
    const email = `new-landlord-${randomUUID().slice(0, 8)}@test.example`;
    const browser = await clients.open();
    const registered = await browser.post('/api/v1/registrations', {
        firstName: 'Nina',
        lastName: 'Newcomer',
        email,
        password: PASSWORD,
        role: 'LANDLORD',
    });
    expect(registered.status).toBe(200);
    expect(registered.body).toMatchObject({ email, role: 'LANDLORD', emailVerifiedAt: null });
    expect((await browser.get('/api/v1/auth/me')).status).toBe(200);

    const mail = await lastEmailTo(email);
    expect(mail?.subject).toContain('Verify');
    if (!mail) {
        throw new Error('No verification email');
    }

    expect((await browser.get('/api/v1/listings')).status).toBe(200);

    const again = await (
        await clients.open()
    ).post('/api/v1/registrations', {
        firstName: 'Nina',
        lastName: 'Twice',
        email,
        password: PASSWORD,
        role: 'TENANT',
    });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ details: [{ field: 'email' }] });

    const verified = await (await clients.open()).post('/api/v1/auth/email-verifications', { token: tokenOf(mail) });
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ email });
    expect(typeof (await browser.get('/api/v1/auth/me')).body.emailVerifiedAt).toBe('string');

    const spent = await (await clients.open()).post('/api/v1/auth/email-verifications', { token: tokenOf(mail) });
    expect(spent.status).toBe(422);
});

test('refuses publishing to an unverified landlord with EMAIL_NOT_VERIFIED', async () => {
    const email = `unverified-${randomUUID().slice(0, 8)}@test.example`;
    const browser = await clients.open();
    expect(
        (
            await browser.post('/api/v1/registrations', {
                firstName: 'Una',
                lastName: 'Unverified',
                email,
                password: PASSWORD,
                role: 'LANDLORD',
            })
        ).status,
    ).toBe(200);
    const response = await browser.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`);
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'EMAIL_NOT_VERIFIED' });

    const resent = await browser.post('/api/v1/auth/email-verification-requests');
    expect(resent.status).toBe(200);
    await expect.poll(async () => (await allEmails()).filter((message) => message.to.includes(email)).length).toBe(2);
});

test('rejects a bad verification token and does not say whether an email exists on reset', async () => {
    const bad = await (await clients.open()).post('/api/v1/auth/email-verifications', { token: 'not-a-real-token' });
    expect(bad.status).toBe(422);
    expect(bad.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });

    const unknown = await (
        await clients.open()
    ).post('/api/v1/auth/password-reset-requests', {
        email: `ghost-${randomUUID().slice(0, 8)}@test.example`,
    });
    expect(unknown.status).toBe(200);
});

test('resets a password by email: old sessions end, the browser is signed in, the old password stops working', async () => {
    const victim = await clients.signedIn(f.tenant.email, PASSWORD);

    const requested = await (
        await clients.open()
    ).post('/api/v1/auth/password-reset-requests', {
        email: f.tenant.email.toUpperCase(),
    });
    expect(requested.status).toBe(200);
    const mail = await lastEmailTo(f.tenant.email);
    expect(mail?.subject).toContain('Reset');
    if (!mail) {
        throw new Error('No reset email');
    }

    const browser = await clients.open();
    const reset = await browser.post('/api/v1/auth/password-resets', {
        token: tokenOf(mail),
        newPassword: NEW_PASSWORD,
    });
    expect(reset.status).toBe(200);
    expect(reset.body).toMatchObject({ email: f.tenant.email });
    expect((await browser.get('/api/v1/auth/me')).status).toBe(200);

    expect((await victim.get('/api/v1/auth/me')).status).toBe(401);
    expect((await (await clients.open()).login(f.tenant.email, PASSWORD)).status).toBe(401);
    expect((await (await clients.open()).login(f.tenant.email, NEW_PASSWORD)).status).toBe(200);
});

test('changes the password from Settings and signs out', async () => {
    const browser = await clients.signedIn(f.landlord.email, PASSWORD);
    const wrong = await browser.put('/api/v1/auth/password', {
        currentPassword: 'Not-The-Password-1!',
        newPassword: NEW_PASSWORD,
    });
    expect(wrong.status).toBe(422);
    expect(wrong.body).toMatchObject({ details: [{ field: 'currentPassword' }] });
    const changed = await browser.put('/api/v1/auth/password', {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
    });
    expect(changed.status).toBe(204);
    expect((await browser.get('/api/v1/auth/me')).status).toBe(200);

    expect((await browser.post('/api/v1/auth/logout')).status).toBe(200);
    expect((await browser.get('/api/v1/auth/me')).status).toBe(401);
    expect((await (await clients.open()).login(f.landlord.email, NEW_PASSWORD)).status).toBe(200);
});

test('pages the security log by cursor, newest first, and refuses a forged cursor (API-23)', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await clients.signedIn(f.agent.email, PASSWORD);
    }
    const browser = await clients.signedIn(f.agent.email, PASSWORD);

    const seen: string[] = [];
    let after: string | null = null;
    do {
        const query: string = after ? `?size=2&after=${after}` : '?size=2';
        const page = await browser.get(`/api/v1/auth/security-log${query}`);
        expect(page.status).toBe(200);
        const body = page.body as { content: { id: string }[]; nextCursor: string | null };
        expect(body.content.length).toBeLessThanOrEqual(2);
        seen.push(...body.content.map((event) => event.id));
        after = body.nextCursor;
    } while (after);

    expect(seen.length).toBeGreaterThanOrEqual(4);
    expect(new Set(seen).size).toBe(seen.length);
    const all = (await browser.get('/api/v1/auth/security-log?size=100')).body as { content: { id: string }[] };
    expect(all.content.map((event) => event.id)).toEqual(seen);

    expect((await browser.get('/api/v1/auth/security-log?after=not-a-cursor')).status).toBe(400);
});
