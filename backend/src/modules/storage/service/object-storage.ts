export interface PresignedUpload {
    url: string;
    expiresAt: Date;
    headers: Record<string, string>;
}

export interface StoredObject {
    sizeBytes: number;
    contentType: string | undefined;
}

/**
 * FILE-1..4, INT-1: the port to object storage — one adapter per provider in
 * `adapter/`. Provider types and errors never leave the adapter; outages become
 * `UpstreamUnavailableException`.
 */
export abstract class ObjectStorage {
    /** FILE-2: the client PUTs the object directly; it must send exactly the returned headers (signed in). */
    abstract presignUpload(key: string, contentType: string, sizeBytes: number): Promise<PresignedUpload>;
    /** Size and declared type of a stored object; undefined when it was never uploaded. */
    abstract head(key: string): Promise<StoredObject | undefined>;
    /** FILE-3: the first bytes of an object, for the magic-number check. */
    abstract readHead(key: string, bytes: number): Promise<Uint8Array>;
    abstract delete(key: string): Promise<void>;
    /** Where everyone reads the object from (the bucket serves public reads). */
    abstract publicUrl(key: string): string;
}
