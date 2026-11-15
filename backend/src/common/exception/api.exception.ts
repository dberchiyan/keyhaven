import type { I18nPath } from '../i18n/i18n-path';
import { ErrorCode } from './error-code';

export type MessageArgs = Readonly<Record<string, string | number>>;

/** Base of every error our code throws. Carries an i18n key, never a message string. */
export abstract class ApiException extends Error {
  readonly status: number;

  protected constructor(
    readonly code: ErrorCode,
    readonly messageKey: I18nPath,
    readonly args: MessageArgs = {},
  ) {
    super(code);
    this.status = ErrorCode[code];
  }
}

export class NotAuthenticatedException extends ApiException {
  constructor() {
    super('UNAUTHORIZED', 'errors.UNAUTHORIZED');
  }
}

export class InvalidCredentialsException extends ApiException {
  constructor() {
    super('INVALID_CREDENTIALS', 'errors.INVALID_CREDENTIALS');
  }
}

/** The route is in the `verified` scope and the caller's email address is not verified yet. */
export class EmailNotVerifiedException extends ApiException {
  constructor() {
    super('EMAIL_NOT_VERIFIED', 'errors.EMAIL_NOT_VERIFIED');
  }
}

/** The public demo refuses actions that would lock other visitors out. */
export class DemoRestrictedException extends ApiException {
  constructor() {
    super('DEMO_RESTRICTED', 'errors.DEMO_RESTRICTED');
  }
}

/** The public demo's showcase listings are read-only; what a visitor adds is theirs to change. */
export class DemoReadOnlyException extends ApiException {
  constructor() {
    super('DEMO_READ_ONLY', 'errors.DEMO_READ_ONLY');
  }
}

export class SessionExpiredException extends ApiException {
  constructor() {
    super('SESSION_EXPIRED', 'errors.SESSION_EXPIRED');
  }
}

export class AccessDeniedException extends ApiException {
  constructor() {
    super('FORBIDDEN', 'errors.FORBIDDEN');
  }
}

export class UnsupportedMediaTypeException extends ApiException {
  constructor() {
    super('UNSUPPORTED_MEDIA_TYPE', 'errors.UNSUPPORTED_MEDIA_TYPE');
  }
}

export class RateLimitExceededException extends ApiException {
  constructor(readonly retryAfterSeconds: number) {
    super('RATE_LIMIT_EXCEEDED', 'errors.RATE_LIMIT_EXCEEDED', {
      minutes: Math.max(1, Math.ceil(retryAfterSeconds / 60)),
    });
  }
}

export class UpstreamUnavailableException extends ApiException {
  constructor() {
    super('UPSTREAM_UNAVAILABLE', 'errors.UPSTREAM_UNAVAILABLE');
  }
}

export class InvalidParameterException extends ApiException {
  constructor(parameter: string) {
    super('INVALID_PARAMETER', 'errors.INVALID_PARAMETER', { parameter });
  }
}

/** 409 — the request conflicts with existing data; `field` points the client at the input. */
export class BusinessConflictException extends ApiException {
  constructor(
    messageKey: I18nPath,
    args: MessageArgs = {},
    readonly field?: string,
  ) {
    super('CONFLICT', messageKey, args);
  }
}

/** 422 — the request is well-formed but breaks a business rule. */
export class BusinessRuleException extends ApiException {
  constructor(
    messageKey: I18nPath,
    args: MessageArgs = {},
    readonly field?: string,
  ) {
    super('BUSINESS_RULE_VIOLATION', messageKey, args);
  }
}

export class IdempotencyKeyReusedException extends ApiException {
  constructor() {
    super('IDEMPOTENCY_KEY_REUSED', 'errors.IDEMPOTENCY_KEY_REUSED');
  }
}

/** 409 — the same Idempotency-Key is still being processed. */
export class RequestInProgressException extends ApiException {
  constructor() {
    super('CONFLICT', 'errors.CONFLICT');
  }
}

export class ResourceNotFoundException extends ApiException {
  constructor() {
    super('RESOURCE_NOT_FOUND', 'errors.RESOURCE_NOT_FOUND');
  }
}

/** 409 — the slot went to another request meanwhile (the partial unique index decided). */
export class ViewingSlotTakenException extends ApiException {
  constructor() {
    super('VIEWING_SLOT_TAKEN', 'errors.VIEWING_SLOT_TAKEN');
  }
}

/** 409 — the record changed since the client read it (optimistic locking). */
export class ConcurrentModificationException extends ApiException {
  constructor() {
    super('CONCURRENT_MODIFICATION', 'errors.CONCURRENT_MODIFICATION');
  }
}
