/** Mirrored by ck_viewings_status. */
export const ViewingStatus = {
  /** The tenant asked; the owner has not answered yet. The slot is held meanwhile. */
  REQUESTED: 'REQUESTED',
  /** The owner said yes: the tenant sees the exact address from now on. */
  CONFIRMED: 'CONFIRMED',
  /** The owner said no (with an optional note). */
  DECLINED: 'DECLINED',
  /** Called off by the tenant, or by the owner after confirming. */
  CANCELLED: 'CANCELLED',
  /** The slot started before the owner answered (set by the scheduler). */
  EXPIRED: 'EXPIRED',
} as const;
export type ViewingStatus = (typeof ViewingStatus)[keyof typeof ViewingStatus];
export const VIEWING_STATUSES = Object.values(ViewingStatus) as [ViewingStatus, ...ViewingStatus[]];

export const isViewingStatus = (value: string): value is ViewingStatus =>
  (VIEWING_STATUSES as readonly string[]).includes(value);

/** A live viewing holds its slot (the partial unique indexes cover exactly these two). */
export const ACTIVE_VIEWING_STATUSES = [
  ViewingStatus.REQUESTED,
  ViewingStatus.CONFIRMED,
] as const satisfies readonly ViewingStatus[];

/** Mirrored by ck_viewings_cancelled_by_value. */
export const CancelledBy = { TENANT: 'TENANT', OWNER: 'OWNER' } as const;
export type CancelledBy = (typeof CancelledBy)[keyof typeof CancelledBy];
export const CANCELLED_BY = Object.values(CancelledBy) as [CancelledBy, ...CancelledBy[]];

/**
 * The owner's answers and either side's cancellation (architecture.md → state machines are one
 * table). A decision that leads to the current status is a no-op; any other transition is 422.
 */
export const VIEWING_TRANSITIONS = {
  confirm: { from: [ViewingStatus.REQUESTED], to: ViewingStatus.CONFIRMED },
  decline: { from: [ViewingStatus.REQUESTED], to: ViewingStatus.DECLINED },
  cancel: { from: [ViewingStatus.REQUESTED, ViewingStatus.CONFIRMED], to: ViewingStatus.CANCELLED },
} as const satisfies Record<string, { from: readonly ViewingStatus[]; to: ViewingStatus }>;
export type ViewingTransition = keyof typeof VIEWING_TRANSITIONS;
