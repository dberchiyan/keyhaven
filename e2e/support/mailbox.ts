import { expect } from '@playwright/test';

import type { CapturedEmail } from './fakes/fake-mail';
import { MAILBOX_URL } from './stack';

/** How long a test waits before it concludes that no email (or event) is coming. */
export const QUIET_MS = 500;

/** Every message the backend sent through SMTP during the run, oldest first. */
export const allEmails = async (): Promise<CapturedEmail[]> => {
    const response = await fetch(`${MAILBOX_URL}/messages`);
    return (await response.json()) as CapturedEmail[];
};

/** How many messages went out so far — compared before and after an action. */
export const emailCount = async (): Promise<number> => (await allEmails()).length;

/**
 * The newest message to this address among those sent after the first `since` (`emailCount()` taken before the
 * action, 0 for any). Mail goes out after commit, so it is polled for (E2E-20); an older message to the same person
 * never stands in for the one the action sends, and the poll fails when none arrives.
 */
export const emailAfter = async (email: string, since: number): Promise<CapturedEmail> => {
    const address = email.toLowerCase();
    let found: CapturedEmail | undefined;
    await expect
        .poll(
            async () => {
                found = (await allEmails())
                    .slice(since)
                    .reverse()
                    .find((message) => message.to.includes(address));
                return found;
            },
            { message: `an email to ${email} after message ${String(since)}` },
        )
        .toBeDefined();
    if (!found) {
        throw new Error(`No email to ${email} after message ${String(since)}`);
    }
    return found;
};

/** The last message to this address so far, once one has arrived. */
export const lastEmailTo = (email: string): Promise<CapturedEmail> => emailAfter(email, 0);

/** The `token=` of the first link in the message. */
export const tokenOf = (message: CapturedEmail): string => {
    const match = /[?&]token=([^\s&"]+)/.exec(message.text);
    if (!match?.[1]) {
        throw new Error('No token link in the email');
    }
    return decodeURIComponent(match[1]);
};

/** Waits `QUIET_MS`: what the backend would have sent after commit has been sent by then. */
export const quietPeriod = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, QUIET_MS));
