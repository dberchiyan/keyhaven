import type { EmailMessage } from '../../email/service/email-sender';

/** Every interpolated value is escaped (security.md → Injection: templates escape everything). */
const escapeHtml = (value: string): string =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const layout = (title: string, paragraphs: string[], link: { href: string; label: string }): string =>
    `<!doctype html><html lang="en"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1f2933">
<h1 style="font-size:20px">${escapeHtml(title)}</h1>
${paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('\n')}
<p><a href="${escapeHtml(link.href)}" style="display:inline-block;padding:10px 16px;background:#21697c;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(link.label)}</a></p>
<p style="font-size:13px;color:#52606d">If the button does not work, open this link:<br>${escapeHtml(link.href)}</p>
</body></html>`;

/** The emails the auth module sends; plain text and HTML say the same thing. */
export const accountEmails = {
    verification: (to: string, firstName: string, link: string): EmailMessage => ({
        to,
        subject: 'Verify your email address — Keyhaven',
        text: `Hi ${firstName},\n\nConfirm that this is your email address to finish setting up your Keyhaven account. The link works for 24 hours:\n\n${link}\n\nIf you did not create a Keyhaven account, ignore this email.`,
        html: layout(
            'Verify your email address',
            [
                `Hi ${firstName},`,
                'Confirm that this is your email address to finish setting up your Keyhaven account. The link works for 24 hours.',
                'If you did not create a Keyhaven account, ignore this email.',
            ],
            { href: link, label: 'Verify email' },
        ),
    }),
    passwordReset: (to: string, firstName: string, link: string): EmailMessage => ({
        to,
        subject: 'Reset your password — Keyhaven',
        text: `Hi ${firstName},\n\nSomeone asked to reset the password of your Keyhaven account. The link works for 1 hour:\n\n${link}\n\nIf that was not you, ignore this email — your password stays as it is.`,
        html: layout(
            'Reset your password',
            [
                `Hi ${firstName},`,
                'Someone asked to reset the password of your Keyhaven account. The link works for 1 hour.',
                'If that was not you, ignore this email — your password stays as it is.',
            ],
            { href: link, label: 'Choose a new password' },
        ),
    }),
};
