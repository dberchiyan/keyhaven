import { randomUUID } from 'node:crypto';
import { bodyOf, Client, createTestApp, type TestApp } from './app';
import { FakeEmailSender } from './fake-email.sender';
import { createFixtures, type Fixtures, PASSWORD } from './fixtures';

/** Sign-up, the verification email, what an unverified account may not do, and "forgot password". */
describe('Account life cycle', () => {
  let testApp: TestApp;
  let f: Fixtures;

  beforeAll(async () => {
    testApp = await createTestApp();
    f = await createFixtures(`account-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    await testApp.close();
  });

  const NEW_PASSWORD = 'Brand-New-Password-2026!';

  it('registers a landlord, signs them in and sends the verification link', async () => {
    const email = `new-landlord-${randomUUID().slice(0, 8)}@test.example`;
    const browser = new Client(testApp.app);
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

    const mail = testApp.emails.lastTo(email);
    expect(mail?.subject).toContain('Verify');

    // Unverified: browsing is open, but nothing other people rely on.
    expect((await browser.get('/api/v1/listings')).status).toBe(200);

    const again = await new Client(testApp.app).post('/api/v1/registrations', {
      firstName: 'Nina',
      lastName: 'Twice',
      email,
      password: PASSWORD,
      role: 'TENANT',
    });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ details: [{ field: 'email' }] });

    const verified = await new Client(testApp.app).post('/api/v1/auth/email-verifications', {
      token: FakeEmailSender.tokenOf(mail ?? { to: '', subject: '', text: '', html: '' }),
    });
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({ email });
    expect(typeof bodyOf(await browser.get('/api/v1/auth/me')).emailVerifiedAt).toBe('string');

    // The link is spent.
    const spent = await new Client(testApp.app).post('/api/v1/auth/email-verifications', {
      token: FakeEmailSender.tokenOf(mail ?? { to: '', subject: '', text: '', html: '' }),
    });
    expect(spent.status).toBe(422);
  });

  it('refuses publishing to an unverified landlord with EMAIL_NOT_VERIFIED', async () => {
    const email = `unverified-${randomUUID().slice(0, 8)}@test.example`;
    const browser = new Client(testApp.app);
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
    // Any listing id: the scope is checked before the policy runs.
    const response = await browser.post(`/api/v1/managed-listings/${f.landlordDraft}/publication`);
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'EMAIL_NOT_VERIFIED' });

    const resent = await browser.post('/api/v1/auth/email-verification-requests');
    expect(resent.status).toBe(200);
    expect(testApp.emails.sent.filter((message) => message.to === email)).toHaveLength(2);
  });

  it('rejects a bad verification token and does not say whether an email exists on reset', async () => {
    const bad = await new Client(testApp.app).post('/api/v1/auth/email-verifications', {
      token: 'not-a-real-token',
    });
    expect(bad.status).toBe(422);
    expect(bad.body).toMatchObject({ error: 'BUSINESS_RULE_VIOLATION' });

    const unknown = await new Client(testApp.app).post('/api/v1/auth/password-reset-requests', {
      email: `ghost-${randomUUID().slice(0, 8)}@test.example`,
    });
    expect(unknown.status).toBe(200);
  });

  it('resets a password by email: old sessions end, the browser is signed in, the old password stops working', async () => {
    const victim = new Client(testApp.app);
    expect((await victim.login(f.tenant.email, PASSWORD)).status).toBe(200);

    const requested = await new Client(testApp.app).post('/api/v1/auth/password-reset-requests', {
      email: f.tenant.email.toUpperCase(),
    });
    expect(requested.status).toBe(200);
    const mail = testApp.emails.lastTo(f.tenant.email);
    expect(mail?.subject).toContain('Reset');

    const browser = new Client(testApp.app);
    const reset = await browser.post('/api/v1/auth/password-resets', {
      token: FakeEmailSender.tokenOf(mail ?? { to: '', subject: '', text: '', html: '' }),
      newPassword: NEW_PASSWORD,
    });
    expect(reset.status).toBe(200);
    expect(reset.body).toMatchObject({ email: f.tenant.email });
    expect((await browser.get('/api/v1/auth/me')).status).toBe(200);

    // Every earlier session ended.
    expect((await victim.get('/api/v1/auth/me')).status).toBe(401);
    expect((await new Client(testApp.app).login(f.tenant.email, PASSWORD)).status).toBe(401);
    expect((await new Client(testApp.app).login(f.tenant.email, NEW_PASSWORD)).status).toBe(200);
  });

  it('changes the password from Settings and signs out', async () => {
    const browser = new Client(testApp.app);
    expect((await browser.login(f.landlord.email, PASSWORD)).status).toBe(200);
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
    expect((await new Client(testApp.app).login(f.landlord.email, NEW_PASSWORD)).status).toBe(200);
  });
});
