import { createServer as createHttpServer, type Server as HttpServer } from 'node:http';
import { createServer as createTcpServer, type Server as TcpServer, type Socket } from 'node:net';

export interface CapturedEmail {
    to: string[];
    subject: string;
    text: string;
    html: string;
}

interface Part {
    headers: Map<string, string>;
    body: string;
}

const CRLF = '\r\n';
const END_OF_DATA = `${CRLF}.${CRLF}`;

const HEX = 16;

const decodeQuotedPrintable = (value: string): string => {
    const soft = value.replace(/=\r?\n/g, '');
    const bytes: number[] = [];
    for (let index = 0; index < soft.length; index += 1) {
        const hex = soft.slice(index + 1, index + 3);
        if (soft[index] === '=' && /^[0-9A-F]{2}$/i.test(hex)) {
            bytes.push(Number.parseInt(hex, HEX));
            index += 2;
        } else {
            bytes.push(soft.charCodeAt(index));
        }
    }
    return Buffer.from(bytes).toString('utf8');
};

const decodeWords = (value: string): string =>
    value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=\s*/g, (_match, _charset: string, kind: string, text: string) =>
        kind.toUpperCase() === 'B'
            ? Buffer.from(text, 'base64').toString('utf8')
            : decodeQuotedPrintable(text.replace(/_/g, ' ')),
    );

const parsePart = (raw: string): Part => {
    const split = raw.indexOf(`${CRLF}${CRLF}`);
    const head = split === -1 ? raw : raw.slice(0, split);
    const body = split === -1 ? '' : raw.slice(split + CRLF.length * 2);
    const headers = new Map<string, string>();
    for (const line of head.replace(/\r\n[ \t]+/g, ' ').split(CRLF)) {
        const colon = line.indexOf(':');
        if (colon > 0) {
            headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
        }
    }
    return { headers, body };
};

const decodeBody = (part: Part): string => {
    const encoding = (part.headers.get('content-transfer-encoding') ?? '').toLowerCase();
    if (encoding === 'base64') {
        return Buffer.from(part.body.replace(/\s+/g, ''), 'base64').toString('utf8');
    }
    if (encoding === 'quoted-printable') {
        return decodeQuotedPrintable(part.body);
    }
    return part.body;
};

const leafParts = (part: Part): Part[] => {
    const type = part.headers.get('content-type') ?? 'text/plain';
    const boundary = /boundary="?([^";]+)"?/i.exec(type)?.[1];
    if (!type.toLowerCase().startsWith('multipart/') || !boundary) {
        return [part];
    }
    return part.body
        .split(`--${boundary}`)
        .slice(1)
        .filter((chunk) => !chunk.startsWith('--'))
        .flatMap((chunk) => leafParts(parsePart(chunk.replace(/^\r\n/, ''))));
};

const toEmail = (raw: string, recipients: string[]): CapturedEmail => {
    const message = parsePart(raw);
    const leaves = leafParts(message);
    const ofType = (type: string): string =>
        leaves
            .filter((leaf) => (leaf.headers.get('content-type') ?? 'text/plain').toLowerCase().startsWith(type))
            .map(decodeBody)
            .join('\n');
    return {
        to: recipients,
        subject: decodeWords(message.headers.get('subject') ?? ''),
        text: ofType('text/plain'),
        html: ofType('text/html'),
    };
};

/**
 * A tiny SMTP server (no TLS, no auth) that keeps every message, and an HTTP mailbox the tests read
 * (`GET /messages`, `DELETE /messages`) — the backend sends through its real SMTP adapter.
 */
export class FakeMail {
    private readonly messages: CapturedEmail[] = [];
    private readonly smtp: TcpServer;
    private readonly mailbox: HttpServer;

    constructor() {
        this.smtp = createTcpServer((socket) => {
            this.converse(socket);
        });
        this.mailbox = createHttpServer((request, response) => {
            if (request.method === 'DELETE') {
                this.messages.length = 0;
                response.writeHead(204).end();
                return;
            }
            response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(this.messages));
        });
    }

    async start(smtpPort: number, mailboxPort: number): Promise<void> {
        await new Promise<void>((resolve) => this.smtp.listen(smtpPort, resolve));
        await new Promise<void>((resolve) => this.mailbox.listen(mailboxPort, resolve));
    }

    async stop(): Promise<void> {
        await new Promise<void>((resolve) =>
            this.smtp.close(() => {
                resolve();
            }),
        );
        await new Promise<void>((resolve) =>
            this.mailbox.close(() => {
                resolve();
            }),
        );
    }

    private converse(socket: Socket): void {
        let buffer = '';
        let isReadingData = false;
        let recipients: string[] = [];
        const reply = (line: string): void => {
            socket.write(`${line}${CRLF}`);
        };
        reply('220 e2e-smtp ready');
        socket.on('data', (chunk) => {
            buffer += chunk.toString('binary');
            for (;;) {
                if (isReadingData) {
                    const end = buffer.indexOf(END_OF_DATA);
                    if (end === -1) {
                        return;
                    }
                    const raw = Buffer.from(buffer.slice(0, end), 'binary')
                        .toString('utf8')
                        .replace(/\r\n\.\./g, `${CRLF}.`);
                    buffer = buffer.slice(end + END_OF_DATA.length);
                    isReadingData = false;
                    this.messages.push(toEmail(raw, recipients));
                    recipients = [];
                    reply('250 OK queued');
                    continue;
                }
                const lineEnd = buffer.indexOf(CRLF);
                if (lineEnd === -1) {
                    return;
                }
                const line = buffer.slice(0, lineEnd);
                buffer = buffer.slice(lineEnd + CRLF.length);
                const command = line.slice(0, 4).toUpperCase();
                if (command === 'EHLO') {
                    reply('250-e2e-smtp');
                    reply('250 8BITMIME');
                } else if (command === 'RCPT') {
                    recipients.push((/<([^>]*)>/.exec(line)?.[1] ?? '').toLowerCase());
                    reply('250 OK');
                } else if (command === 'DATA') {
                    isReadingData = true;
                    reply('354 End data with <CR><LF>.<CR><LF>');
                } else if (command === 'QUIT') {
                    reply('221 Bye');
                    socket.end();
                    return;
                } else {
                    reply('250 OK');
                }
            }
        });
    }
}
