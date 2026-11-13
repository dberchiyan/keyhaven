import type { PermissionService } from './permission.service';
import type { Principal } from './principal';

export type PolicyArgs = Readonly<Record<string, string>>;

export type PolicyCheck = (
  principal: Principal,
  args: PolicyArgs,
  permissions: PermissionService,
) => boolean | Promise<boolean>;

/** A public policy sees the visitor's session when there is one. */
export type PublicPolicyCheck = (
  principal: Principal | null,
  args: PolicyArgs,
  permissions: PermissionService,
) => boolean | Promise<boolean>;

/**
 * Where a route works: `signedIn` (default) — anyone with a session; `verified` — only after the
 * email address was verified (actions other people depend on: publishing, booking); `account` —
 * the caller's own account (sign-out, password, sessions, resending the verification email);
 * `public` — visitors without a session too (the catalogue), the policy then receives `null`.
 */
export type PolicyScope = 'signedIn' | 'verified' | 'account' | 'public';

export type Policy =
  | {
      /** Path params the policy checks — every `:xxxId` in the route must be one of them. */
      readonly params: readonly string[];
      readonly check: PolicyCheck;
      readonly scope: Exclude<PolicyScope, 'public'>;
    }
  | {
      readonly params: readonly string[];
      readonly check: PublicPolicyCheck;
      readonly scope: 'public';
    };

export const policy = (
  params: readonly string[],
  check: PolicyCheck,
  scope: Exclude<PolicyScope, 'public'> = 'signedIn',
): Policy => ({ params, check, scope });

/** A route open to visitors: the policy still checks every path id (security.md). */
export const publicPolicy = (params: readonly string[], check: PublicPolicyCheck): Policy => ({
  params,
  check,
  scope: 'public',
});
