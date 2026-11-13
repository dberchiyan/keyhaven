/** What an upload intent needs from the store: where to PUT, and the headers signed into it. */
export interface PresignedUpload {
  url: string;
  /** Expires with the URL (platform.md → 15 minutes). */
  expiresAt: Date;
  /** The client must send exactly these (Content-Type, Content-Length are signed in). */
  headers: Record<string, string>;
}

export interface StoredObject {
  sizeBytes: number;
  contentType: string | null;
}

/**
 * The port to object storage (platform.md → File uploads): one adapter per provider in
 * `adapter/`. Provider types and errors never leave the adapter; outages become
 * `UpstreamUnavailableException`.
 */
export abstract class ObjectStorage {
  /** A URL the client PUTs the object to directly; size and type are signed into it. */
  abstract presignUpload(
    key: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<PresignedUpload>;
  /** Size and declared type of a stored object; null when it was never uploaded. */
  abstract head(key: string): Promise<StoredObject | null>;
  /** The first bytes of an object (magic-number check). */
  abstract readHead(key: string, bytes: number): Promise<Uint8Array>;
  abstract delete(key: string): Promise<void>;
  /** Where everyone reads the object from (the bucket serves public reads). */
  abstract publicUrl(key: string): string;
}
