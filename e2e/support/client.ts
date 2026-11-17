import { randomUUID } from 'node:crypto';
import { type APIRequestContext, request } from '@playwright/test';

import { BACKEND_URL } from './stack';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'X-XSRF-TOKEN';
const HTTP_OK = 200;

export interface ApiResponse {
    status: number;
    body: Record<string, unknown>;
    headers: Record<string, string>;
    text: string;
}

const toResponse = async (response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<ApiResponse> => {
    const text = await response.text();
    let body: Record<string, unknown> = {};
    try {
        const parsed: unknown = text ? JSON.parse(text) : {};
        body = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
        body = {};
    }
    return { status: response.status(), body, headers: response.headers(), text };
};

/** A browser without the browser: its own cookie jar, the XSRF header echoed on every mutation (AUTH-5). */
export class Client {
    private constructor(
        private readonly context: APIRequestContext,
        readonly baseURL: string,
    ) {}

    static async create(baseURL: string = BACKEND_URL): Promise<Client> {
        return new Client(await request.newContext({ baseURL }), baseURL);
    }

    async dispose(): Promise<void> {
        await this.context.dispose();
    }

    login(email: string, password: string): Promise<ApiResponse> {
        return this.post('/api/v1/auth/login', { email, password });
    }

    async get(path: string): Promise<ApiResponse> {
        return toResponse(await this.context.get(path));
    }

    async post(path: string, body: unknown = {}, headers: Record<string, string> = {}): Promise<ApiResponse> {
        return toResponse(
            await this.context.post(path, { data: body, headers: { ...(await this.csrf()), ...headers } }),
        );
    }

    /** A side-effecting POST with its Idempotency-Key (API-5). */
    postIdempotent(path: string, body: unknown, key: string = randomUUID()): Promise<ApiResponse> {
        return this.post(path, body, { 'Idempotency-Key': key });
    }

    /** A mutation that forgets the XSRF header — what a cross-site form post would look like. */
    async postWithoutCsrf(path: string): Promise<ApiResponse> {
        return toResponse(await this.context.post(path, { data: {} }));
    }

    async put(path: string, body: unknown = {}): Promise<ApiResponse> {
        return toResponse(await this.context.put(path, { data: body, headers: await this.csrf() }));
    }

    async delete(path: string): Promise<ApiResponse> {
        return toResponse(await this.context.delete(path, { headers: await this.csrf() }));
    }

    /** A raw request, for what JSON helpers cannot send (another content type, a body on a GET). */
    async raw(path: string, options: Parameters<APIRequestContext['fetch']>[1]): Promise<ApiResponse> {
        return toResponse(await this.context.fetch(path, options));
    }

    /** The cookies as a `Cookie` header, for a request the context cannot make (a stream read as it arrives). */
    async cookieHeader(): Promise<string> {
        const { cookies } = await this.context.storageState();
        return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    }

    private async csrf(): Promise<Record<string, string>> {
        const { cookies } = await this.context.storageState();
        const token = cookies.find((cookie) => cookie.name === CSRF_COOKIE)?.value;
        return token ? { [CSRF_HEADER]: token } : {};
    }
}

/** The clients one test file opens, closed together in its `afterAll`. */
export class ClientPool {
    private readonly clients: Client[] = [];

    constructor(private readonly baseURL: string = BACKEND_URL) {}

    async open(): Promise<Client> {
        const client = await Client.create(this.baseURL);
        this.clients.push(client);
        return client;
    }

    /** A new browser signed in as `email`; the sign-in must succeed. */
    async signedIn(email: string, password: string): Promise<Client> {
        const client = await this.open();
        const response = await client.login(email, password);
        if (response.status !== HTTP_OK) {
            throw new Error(`Sign-in of ${email} answered ${String(response.status)}: ${response.text}`);
        }
        return client;
    }

    async disposeAll(): Promise<void> {
        await Promise.all(this.clients.map((client) => client.dispose()));
        this.clients.length = 0;
    }
}
