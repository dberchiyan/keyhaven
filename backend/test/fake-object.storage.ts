import {
  ObjectStorage,
  type PresignedUpload,
  type StoredObject,
} from '../src/modules/storage/service/object-storage';

/** An in-memory store: a test "uploads" by writing bytes under the key the intent named. */
export class FakeObjectStorage extends ObjectStorage {
  readonly objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  readonly deleted: string[] = [];

  presignUpload(key: string, contentType: string, sizeBytes: number): Promise<PresignedUpload> {
    return Promise.resolve({
      url: `https://storage.test/${key}?signed`,
      expiresAt: new Date(Date.now() + 15 * 60_000),
      headers: { 'Content-Type': contentType, 'Content-Length': String(sizeBytes) },
    });
  }

  head(key: string): Promise<StoredObject | null> {
    const object = this.objects.get(key);
    return Promise.resolve(
      object ? { sizeBytes: object.bytes.length, contentType: object.contentType } : null,
    );
  }

  readHead(key: string, bytes: number): Promise<Uint8Array> {
    return Promise.resolve(this.objects.get(key)?.bytes.subarray(0, bytes) ?? new Uint8Array());
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.deleted.push(key);
    return Promise.resolve();
  }

  publicUrl(key: string): string {
    return `https://photos.test/${key}`;
  }

  /** What the browser would PUT: the key is the last path segments of the signed URL. */
  upload(uploadUrl: string, bytes: Uint8Array, contentType: string): void {
    const key = new URL(uploadUrl).pathname.replace(/^\//, '');
    this.objects.set(key, { bytes, contentType });
  }
}

/** A valid PNG head: the signature plus the IHDR chunk start (16 bytes). */
export const PNG_HEAD = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
