import type { Schemas } from '@/shared/types';

export type Viewing = Schemas['Viewing_Output'];
export type ViewingStatus = Schemas['ViewingStatus_Output'];
export type ViewingListing = Viewing['listing'];
export type ViewingSlots = Schemas['ViewingSlotsResponse_Output'];
export type ViewingSlotDay = Schemas['ViewingSlotDay_Output'];
export type ViewingSlot = Schemas['ViewingSlot_Output'];
export type ViewingSchedule = Schemas['ViewingSchedule_Output'];
export type ViewingWindow = Schemas['ViewingWindow_Output'];
export type ViewingScheduleState = Schemas['ViewingScheduleStateResponse_Output'];
export type ViewingSummary = Schemas['ViewingSummaryResponse_Output'];
export type ViewingPage = Schemas['ViewingPageResponse_Output'];
export type RequestViewingRequest = Schemas['RequestViewingRequest'];
export type ViewingNoteRequest = Schemas['ViewingNoteRequest'];
export type SaveViewingScheduleRequest = Schemas['SaveViewingScheduleRequest'];

export type ViewingDecision = 'confirm' | 'decline' | 'cancel';

export const ACTIVE_VIEWING_STATUSES = ['REQUESTED', 'CONFIRMED'] as const satisfies readonly ViewingStatus[];

export const MANAGED_VIEWS = ['requests', 'upcoming', 'all'] as const;
export type ManagedView = (typeof MANAGED_VIEWS)[number];

export interface ManagedViewingsParams {
    view: ManagedView;
    page: number;
    size: number;
}
