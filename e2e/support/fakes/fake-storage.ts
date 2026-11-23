import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

interface StoredObject {
    bytes: Buffer;
    contentType: string;
}

const ADMIN_PREFIX = '/_e2e/';
const RANGE_PATTERN = /^bytes=(\d+)-(\d+)?$/;
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_PARTIAL = 206;
const HTTP_NOT_FOUND = 404;

const readBody = async (request: IncomingMessage): Promise<Buffer> => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return Buffer.concat(chunks);
};

/**
 * An in-memory, path-style S3 store: PUT (the browser's presigned upload), HEAD, ranged GET and DELETE — what the
 * backend's real S3 adapter calls. Signatures are not checked. `GET /_e2e/objects` and `/_e2e/deleted` let a test see
 * what is stored and what the backend removed.
 */
export class FakeStorage {
    private readonly objects = new Map<string, StoredObject>();
    private readonly deleted: string[] = [];
    private readonly server: Server;

    constructor() {
        this.server = createServer((request, response) => {
            void this.handle(request, response);
        });
    }

    async start(port: number): Promise<void> {
        await new Promise<void>((resolve) => this.server.listen(port, resolve));
    }

    async stop(): Promise<void> {
        this.server.closeAllConnections();
        await new Promise<void>((resolve) =>
            this.server.close(() => {
                resolve();
            }),
        );
    }

    private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
        const url = new URL(request.url ?? '/', 'http://storage');
        if (url.pathname.startsWith(ADMIN_PREFIX)) {
            const list = url.pathname === `${ADMIN_PREFIX}deleted` ? this.deleted : [...this.objects.keys()];
            response.writeHead(HTTP_OK, { 'Content-Type': 'application/json' }).end(JSON.stringify(list));
            return;
        }
        const key = decodeURIComponent(url.pathname.replace(/^\/[^/]+\//, ''));
        const object = this.objects.get(key);
        switch (request.method) {
            case 'PUT': {
                const bytes = await readBody(request);
                this.objects.set(key, {
                    bytes,
                    contentType: request.headers['content-type'] ?? 'application/octet-stream',
                });
                response.writeHead(HTTP_OK, { ETag: '"e2e"' }).end();
                return;
            }
            case 'HEAD':
                if (!object) {
                    response.writeHead(HTTP_NOT_FOUND).end();
                    return;
                }
                response
                    .writeHead(HTTP_OK, {
                        'Content-Length': String(object.bytes.length),
                        'Content-Type': object.contentType,
                        ETag: '"e2e"',
                        'Last-Modified': new Date().toUTCString(),
                    })
                    .end();
                return;
            case 'GET':
                this.read(request, response, object);
                return;
            case 'DELETE':
                this.objects.delete(key);
                this.deleted.push(key);
                response.writeHead(HTTP_NO_CONTENT).end();
                return;
            default:
                response.writeHead(HTTP_NOT_FOUND).end();
        }
    }

    private read(request: IncomingMessage, response: ServerResponse, object: StoredObject | undefined): void {
        if (!object) {
            response
                .writeHead(HTTP_NOT_FOUND, { 'Content-Type': 'application/xml' })
                .end('<Error><Code>NoSuchKey</Code></Error>');
            return;
        }
        const range = RANGE_PATTERN.exec(request.headers.range ?? '');
        const start = range ? Number(range[1]) : 0;
        const end = Math.min(range?.[2] ? Number(range[2]) : object.bytes.length - 1, object.bytes.length - 1);
        const slice = object.bytes.subarray(start, end + 1);
        response
            .writeHead(range ? HTTP_PARTIAL : HTTP_OK, {
                'Content-Length': String(slice.length),
                'Content-Type': object.contentType,
                ...(range
                    ? { 'Content-Range': `bytes ${String(start)}-${String(end)}/${String(object.bytes.length)}` }
                    : {}),
                ETag: '"e2e"',
            })
            .end(slice);
    }
}
