import type { ClientType } from './client-type';

/**
 * The authenticated caller, resolved from the session on every request. There is no organisation
 * tenant (Keyhaven is a marketplace): what a caller may touch is decided by their role and by
 * ownership — their own listings (landlord) or their agency's (agent). The demo's showcase accounts are told apart
 * by the sign-in email; `isEmailVerified` also holds after a password reset by email (the link proved the address).
 */
export class Principal {
    constructor(
        readonly userId: string,
        readonly email: string,
        readonly isEmailVerified: boolean,
        readonly agencyId: string | null,
        readonly sessionId: string,
        readonly authorities: readonly string[],
        readonly clientType: ClientType,
        readonly csrfTokenHash: string,
    ) {}

    hasAuthority(authority: string): boolean {
        return this.authorities.includes(authority);
    }
}
