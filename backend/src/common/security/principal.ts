export const ClientType = {
  WEB: 'web',
  MOBILE: 'mobile',
} as const;
export type ClientType = (typeof ClientType)[keyof typeof ClientType];

/**
 * The authenticated caller, resolved from the session on every request. There is no organisation
 * tenant (Keyhaven is a marketplace): what a caller may touch is decided by their role and by
 * ownership — their own listings (landlord) or their agency's (agent).
 */
export class Principal {
  constructor(
    readonly userId: string,
    /** Sign-in email (lower-case) — the demo's showcase accounts are told apart by it. */
    readonly email: string,
    /** The person opened the verification link (or reset their password through email). */
    readonly isEmailVerified: boolean,
    /** The agent's agency; null for every other role. */
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
