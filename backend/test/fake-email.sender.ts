import { type EmailMessage, EmailSender } from '../src/modules/email/service/email-sender';

/** Keeps every message in memory so a test can read the link out of it. */
export class FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  /** The last message to this address, or null. */
  lastTo(email: string): EmailMessage | null {
    return [...this.sent].reverse().find((message) => message.to === email.toLowerCase()) ?? null;
  }

  /** The `token=` of the first link in the message. */
  static tokenOf(message: EmailMessage): string {
    const match = /[?&]token=([^\s&"]+)/.exec(message.text);
    if (!match?.[1]) {
      throw new Error('No token link in the email');
    }
    return decodeURIComponent(match[1]);
  }
}
