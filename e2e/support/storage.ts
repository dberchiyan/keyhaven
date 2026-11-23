import { STORAGE_URL } from './stack';

export const PNG_HEAD = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

/** What the browser does with a presigned upload: PUT the bytes with the signed headers. */
export const upload = async (url: string, bytes: Uint8Array, headers: Record<string, string>): Promise<number> => {
    const response = await fetch(url, { method: 'PUT', body: Buffer.from(bytes), headers });
    return response.status;
};

/** The keys the backend deleted from the store during the run. */
export const deletedKeys = async (): Promise<string[]> =>
    (await (await fetch(`${STORAGE_URL}/_e2e/deleted`)).json()) as string[];
