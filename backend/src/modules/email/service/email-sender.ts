/** One message, ready to send: the feature that sends it rendered both bodies. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Every interpolated value is escaped by the renderer (security.md → Injection). */
  html: string;
}

/**
 * The port to email delivery (integrations.md → Provider boundary): one adapter per transport
 * in `adapter/`. Provider types and errors never leave the adapter: it throws
 * `UpstreamUnavailableException` when the server cannot be reached.
 */
export abstract class EmailSender {
  abstract send(message: EmailMessage): Promise<void>;
}
