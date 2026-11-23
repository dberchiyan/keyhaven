import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Observable, Subject } from 'rxjs';

import type { Actor } from '@/common/security/actor';
import { Clock } from '@/common/time/clock';
import { UserRole } from '@/modules/user/service/user-role';

import { type LiveEvent, LiveEventType } from './live-event';

const HEARTBEAT_MS = 25_000;
/** DATA-8: as many open streams per person as sessions (a tab each); the oldest closes beyond it. */
const MAX_STREAMS_PER_USER = 10;

interface Stream {
    userId: string;
    agencyId: string | undefined;
    isAdmin: boolean;
    subject: Subject<LiveEvent>;
    openedAt: number;
}

/**
 * The live channel (SSE): every signed-in browser holds one stream, and the services publish
 * what changed for a person (or for an agency, whose agents share one inbox) after their
 * transaction committed — ids only, the client reads the rest. The set of open streams is the one stateful singleton by design — it
 * is this instance's connections, like a pool, never business data; a second instance would
 * need Postgres LISTEN/NOTIFY to share events (recorded in Project decisions).
 */
@Injectable()
export class EventService implements OnApplicationShutdown {
    private readonly streams = new Set<Stream>();

    constructor(
        private readonly clock: Clock,
        @InjectPinoLogger(EventService.name) private readonly logger: PinoLogger,
    ) {}

    /**
     * A stream for this person: their events, with a heartbeat well under Cloudflare's 100 s idle
     * cut-off and nginx's read timeout; torn down when the browser leaves. Admins' streams share
     * the support inbox.
     */
    subscribe(actor: Actor): Observable<LiveEvent> {
        const { userId, agencyId } = actor;
        const isAdmin = actor.role === UserRole.ADMIN;
        return new Observable<LiveEvent>((observer) => {
            const subject = new Subject<LiveEvent>();
            const stream: Stream = { userId, agencyId, isAdmin, subject, openedAt: this.clock.now().getTime() };
            const subscription = subject.subscribe(observer);
            const own = [...this.streams]
                .filter((candidate) => candidate.userId === userId)
                .sort((left, right) => left.openedAt - right.openedAt);
            if (own.length >= MAX_STREAMS_PER_USER) {
                own[0]?.subject.complete();
            }
            this.streams.add(stream);
            const heartbeat = setInterval(() => {
                subject.next({ type: LiveEventType.PING });
            }, HEARTBEAT_MS);
            this.logger.debug({ userId, open: this.streams.size }, 'Live stream opened');
            return () => {
                clearInterval(heartbeat);
                subscription.unsubscribe();
                this.streams.delete(stream);
                this.logger.debug({ userId, open: this.streams.size }, 'Live stream closed');
            };
        });
    }

    /** To every stream of one person (each of their tabs). */
    publishToUser(userId: string, event: LiveEvent): void {
        for (const stream of this.streams) {
            if (stream.userId === userId) {
                stream.subject.next(event);
            }
        }
    }

    /** To the owner's side of a home: the landlord, or every agent of the agency. */
    publishToOwner(landlordId: string | null, agencyId: string | null, event: LiveEvent): void {
        for (const stream of this.streams) {
            if (
                (landlordId !== null && stream.userId === landlordId) ||
                (agencyId !== null && stream.agencyId === agencyId)
            ) {
                stream.subject.next(event);
            }
        }
    }

    /** To every admin's tabs (the support inbox is theirs together). */
    publishToAdmins(event: LiveEvent): void {
        for (const stream of this.streams) {
            if (stream.isAdmin) {
                stream.subject.next(event);
            }
        }
    }

    /** On shutdown every stream ends cleanly, so browsers reconnect to the next instance. */
    onApplicationShutdown(): void {
        for (const stream of this.streams) {
            stream.subject.complete();
        }
    }
}
