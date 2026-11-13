import type { PermissionService } from './permission.service';
import type { Principal } from './principal';

export type PolicyArgs = Readonly<Record<string, string>>;

export type PolicyCheck = (
  principal: Principal,
  args: PolicyArgs,
  permissions: PermissionService,
) => boolean | Promise<boolean>;

/**
 * Where a route works: `signedIn` (default) — anyone with a session; `verified` — only after the
 * email address was verified (actions other people depend on: publishing, booking); `account` —
 * the caller's own account (sign-out, password, sessions, resending the verification email).
 */
export type PolicyScope = 'signedIn' | 'verified' | 'account';

export interface Policy {
  /** Path params the policy checks — every `:xxxId` in the route must be one of them. */
  readonly params: readonly string[];
  readonly check: PolicyCheck;
  readonly scope: PolicyScope;
}

export const policy = (
  params: readonly string[],
  check: PolicyCheck,
  scope: PolicyScope = 'signedIn',
): Policy => ({ params, check, scope });
