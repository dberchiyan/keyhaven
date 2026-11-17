export const ViewingStatus = {
    REQUESTED: 'REQUESTED',
    CONFIRMED: 'CONFIRMED',
    DECLINED: 'DECLINED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
} as const;
export type ViewingStatus = (typeof ViewingStatus)[keyof typeof ViewingStatus];
export const VIEWING_STATUSES = Object.values(ViewingStatus) as [ViewingStatus, ...ViewingStatus[]];

export const isViewingStatus = (value: string): value is ViewingStatus =>
    (VIEWING_STATUSES as readonly string[]).includes(value);

export const ACTIVE_VIEWING_STATUSES = [
    ViewingStatus.REQUESTED,
    ViewingStatus.CONFIRMED,
] as const satisfies readonly ViewingStatus[];

export const CancelledBy = { TENANT: 'TENANT', OWNER: 'OWNER' } as const;
export type CancelledBy = (typeof CancelledBy)[keyof typeof CancelledBy];
export const CANCELLED_BY = Object.values(CancelledBy) as [CancelledBy, ...CancelledBy[]];

export const VIEWING_TRANSITIONS = {
    confirm: { from: [ViewingStatus.REQUESTED], to: ViewingStatus.CONFIRMED },
    decline: { from: [ViewingStatus.REQUESTED], to: ViewingStatus.DECLINED },
    cancel: { from: [ViewingStatus.REQUESTED, ViewingStatus.CONFIRMED], to: ViewingStatus.CANCELLED },
} as const satisfies Record<string, { from: readonly ViewingStatus[]; to: ViewingStatus }>;
export type ViewingTransition = keyof typeof VIEWING_TRANSITIONS;
