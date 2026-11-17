import type { CapturedEmail } from './fake-mail';
import { MAILBOX_URL } from './stack';

/** Every message the backend sent through SMTP during the run, oldest first. */
export const allEmails = async (): Promise<CapturedEmail[]> => {
    const response = await fetch(`${MAILBOX_URL}/messages`);
    return (await response.json()) as CapturedEmail[];
};

/** The last message to this address. The backend sends after commit, so a short wait covers the delivery. */
export const lastEmailTo = async (email: string, waitMs = 2_000): Promise<CapturedEmail | undefined> => {
    const POLL_MS = 50;
    const deadline = Date.now() + waitMs;
    const address = email.toLowerCase();
    for (;;) {
        const found = (await allEmails()).reverse().find((message) => message.to.includes(address));
        if (found || Date.now() > deadline) {
            return found;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
};

/** How many messages went out so far — compared before and after an action. */
export const emailCount = async (): Promise<number> => (await allEmails()).length;

/** The `token=` of the first link in the message. */
export const tokenOf = (message: CapturedEmail): string => {
    const match = /[?&]token=([^\s&"]+)/.exec(message.text);
    if (!match?.[1]) {
        throw new Error('No token link in the email');
    }
    return decodeURIComponent(match[1]);
};

/**
 * The newest message to this address among those sent after the first `since` — `since` is `emailCount()` taken
 * before the action. Mail goes out after commit, asynchronously, so an older message to the same person must not
 * stand in for the one the action sends; waits for it, and fails when none arrives.
 */
export const emailAfter = async (email: string, since: number, waitMs = 5_000): Promise<CapturedEmail> => {
    const POLL_MS = 50;
    const deadline = Date.now() + waitMs;
    const address = email.toLowerCase();
    for (;;) {
        const found = (await allEmails())
            .slice(since)
            .reverse()
            .find((message) => message.to.includes(address));
        if (found) {
            return found;
        }
        if (Date.now() > deadline) {
            throw new Error(`No email to ${email} after message ${String(since)}`);
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
};

/** How long a test waits before it concludes that no email (or event) is coming. */
export const QUIET_MS = 500;

/** Waits `QUIET_MS`: what the backend would have sent after commit has been sent by then. */
export const quietPeriod = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, QUIET_MS));
