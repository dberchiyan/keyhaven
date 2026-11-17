import type { PermissionService } from './permission.service';
import type { Principal } from './principal';

export type PolicyArgs = Readonly<Record<string, string>>;

export type PolicyCheck = (
    principal: Principal,
    args: PolicyArgs,
    permissions: PermissionService,
) => boolean | Promise<boolean>;

export type PublicPolicyCheck = (
    principal: Principal | null,
    args: PolicyArgs,
    permissions: PermissionService,
) => boolean | Promise<boolean>;

export type PolicyScope = 'signedIn' | 'verified' | 'account' | 'public';

export type Policy =
    | {
          readonly params: readonly string[];
          readonly check: PolicyCheck;
          readonly scope: Exclude<PolicyScope, 'public'>;
      }
    | {
          readonly params: readonly string[];
          readonly check: PublicPolicyCheck;
          readonly scope: 'public';
      };

/**
 * SEC-3: `params` names every `:xxxId` of the route. Scopes (SEC-2, adapted — no organisation tenant): `signedIn`
 * (default) — anyone with a session; `verified` — only after the email address was verified (actions other people
 * depend on: publishing, booking); `account` — the caller's own account (sign-out, password, sessions, resending the
 * verification email).
 */
export const policy = (
    params: readonly string[],
    check: PolicyCheck,
    scope: Exclude<PolicyScope, 'public'> = 'signedIn',
): Policy => ({ params, check, scope });

/** A route open to visitors (the catalogue): the check sees the session when there is one, else `null`, and still checks every path id (SEC-3). */
export const publicPolicy = (params: readonly string[], check: PublicPolicyCheck): Policy => ({
    params,
    check,
    scope: 'public',
});
