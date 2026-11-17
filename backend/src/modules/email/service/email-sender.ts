export interface EmailMessage {
    to: string;
    subject: string;
    text: string;
    html: string;
}

/**
 * INT-1: the port to email delivery — one adapter per transport in `adapter/`; the feature that sends a message
 * renders both bodies and escapes every value it interpolates into the HTML. Provider types and errors never leave the adapter: it throws
 * `UpstreamUnavailableException` when the server cannot be reached.
 */
export abstract class EmailSender {
    abstract send(message: EmailMessage): Promise<void>;
}
