import { ClientType } from './client-type';
import { Principal } from './principal';

export const SessionLookup = {
    VALID: 'VALID',
    EXPIRED: 'EXPIRED',
    UNKNOWN: 'UNKNOWN',
} as const;
export type SessionLookup = (typeof SessionLookup)[keyof typeof SessionLookup];

export type SessionAuthentication =
    | { result: typeof SessionLookup.VALID; principal: Principal }
    | { result: typeof SessionLookup.EXPIRED | typeof SessionLookup.UNKNOWN };

export interface LiveSession {
    sessionId: string;
    userId: string;
    email: string;
    isEmailVerified: boolean;
    agencyId: string | null;
    authorities: readonly string[];
    clientType: string;
    csrfTokenHash: string;
}

/** CORE-25: the principal of a live session is built here, in the security kit — services never handle it. */
export const toPrincipal = (session: LiveSession): Principal =>
    new Principal(
        session.userId,
        session.email,
        session.isEmailVerified,
        session.agencyId,
        session.sessionId,
        session.authorities,
        session.clientType === ClientType.MOBILE ? ClientType.MOBILE : ClientType.WEB,
        session.csrfTokenHash,
    );

/** Implemented by the auth module, which owns the sessions table. */
export abstract class SessionAuthenticator {
    abstract authenticate(token: string): Promise<SessionAuthentication>;
}
