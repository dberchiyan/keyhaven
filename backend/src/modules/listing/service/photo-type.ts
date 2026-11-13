import type { PhotoContentType } from './photo-status';

/**
 * The image type from the first bytes (platform.md: never the client's Content-Type). Three
 * signatures are all the allowlist needs, so no library: JPEG `FF D8 FF`, PNG `89 50 4E 47`,
 * WebP `RIFF????WEBP`.
 */
export const sniffImageType = (head: Uint8Array): PhotoContentType | null => {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    head.length >= 4 &&
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    head.length >= 12 &&
    String.fromCodePoint(...head.subarray(0, 4)) === 'RIFF' &&
    String.fromCodePoint(...head.subarray(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
};
