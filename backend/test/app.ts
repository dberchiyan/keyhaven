import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';

import { AppModule } from '@/app.module';
import { setupApp } from '@/app.setup';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/common/security/csrf.guard';
import { EmailSender } from '@/modules/email/service/email-sender';
import { ObjectStorage } from '@/modules/storage/service/object-storage';

import { FakeEmailSender } from './fake-email.sender';
import { FakeObjectStorage } from './fake-object.storage';

export interface TestApp {
    app: NestExpressApplication;
    emails: FakeEmailSender;
    storage: FakeObjectStorage;
    close: () => Promise<void>;
}

/** The whole application with the real database, a fake mail transport and a fake object store. */
export const createTestApp = async (): Promise<TestApp> => {
    const emails = new FakeEmailSender();
    const storage = new FakeObjectStorage();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(EmailSender)
        .useValue(emails)
        .overrideProvider(ObjectStorage)
        .useValue(storage)
        .compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({
        bodyParser: false,
        logger: false,
    });
    setupApp(app);
    await app.init();
    return {
        app,
        emails,
        storage,
        close: async () => {
            await app.close();
        },
    };
};

/** A response body read without `any`: the tests assert on a few fields. */
export const bodyOf = (response: Response): Record<string, unknown> =>
    typeof response.body === 'object' && response.body !== null ? (response.body as Record<string, unknown>) : {};

/** A signed-in browser: the session cookie and the CSRF token it echoes on mutations. */
export class Client {
    private cookies: string[] = [];
    private csrfToken: string | null = null;

    constructor(private readonly app: NestExpressApplication) {}

    async login(email: string, password: string): Promise<Response> {
        const response = await request(this.app.getHttpServer())
            .post('/api/v1/auth/login')
            .set('Content-Type', 'application/json')
            .send({ email, password });
        this.remember(response);
        return response;
    }

    get(path: string): Promise<Response> {
        return request(this.app.getHttpServer())
            .get(path)
            .set('Cookie', this.cookies)
            .then((r) => r);
    }

    async post(path: string, body: unknown = {}): Promise<Response> {
        const response = await request(this.app.getHttpServer())
            .post(path)
            .set('Cookie', this.cookies)
            .set(CSRF_HEADER_NAME, this.csrfToken ?? '')
            .set('Content-Type', 'application/json')
            .send(body as object);
        this.remember(response);
        return response;
    }

    /** A mutation that forgets the XSRF header — what a cross-site form post would look like. */
    postWithoutCsrf(path: string): Promise<Response> {
        return request(this.app.getHttpServer())
            .post(path)
            .set('Cookie', this.cookies)
            .set('Content-Type', 'application/json')
            .send({})
            .then((r) => r);
    }

    async put(path: string, body: unknown = {}): Promise<Response> {
        const response = await request(this.app.getHttpServer())
            .put(path)
            .set('Cookie', this.cookies)
            .set(CSRF_HEADER_NAME, this.csrfToken ?? '')
            .set('Content-Type', 'application/json')
            .send(body as object);
        this.remember(response);
        return response;
    }

    delete(path: string): Promise<Response> {
        return request(this.app.getHttpServer())
            .delete(path)
            .set('Cookie', this.cookies)
            .set(CSRF_HEADER_NAME, this.csrfToken ?? '')
            .then((r) => r);
    }

    /** A side-effecting POST with its Idempotency-Key (API-5). */
    postIdempotent(path: string, body: unknown, key: string = randomUUID()): Promise<Response> {
        return request(this.app.getHttpServer())
            .post(path)
            .set('Cookie', this.cookies)
            .set(CSRF_HEADER_NAME, this.csrfToken ?? '')
            .set('Idempotency-Key', key)
            .set('Content-Type', 'application/json')
            .send(body as object)
            .then((r) => r);
    }

    /** Keeps the cookies a response set (a sign-in, a password change) for the next request. */
    private remember(response: Response): void {
        const header: unknown = response.headers['set-cookie'];
        const setCookies = Array.isArray(header) ? header.map(String) : [];
        for (const cookie of setCookies) {
            const [pair] = cookie.split(';');
            if (!pair) {
                continue;
            }
            const [name] = pair.split('=');
            this.cookies = this.cookies.filter((existing) => !existing.startsWith(`${name ?? ''}=`));
            if (!/expires=Thu, 01 Jan 1970/i.test(cookie)) {
                this.cookies.push(pair);
            }
            if (name === CSRF_COOKIE_NAME) {
                this.csrfToken = pair.slice(`${CSRF_COOKIE_NAME}=`.length) || null;
            }
        }
    }
}
