import { apiClient } from '@/shared/api/client';
import type {
    ManagedViewingsParams,
    RequestViewingRequest,
    SaveViewingScheduleRequest,
    Viewing,
    ViewingPage,
    ViewingSchedule,
    ViewingScheduleState,
    ViewingSlots,
    ViewingSummary,
} from '../types';

const BASE = '/api/v1';
/** Slots are read a fortnight at a time (the API's most): fewer pages to the right day. */
export const SLOT_DAYS = 14;
export const VIEWINGS_PAGE_SIZE = 10;

const encode = (id: string): string => encodeURIComponent(id);

/** The dashboard's views as query parameters: requests waiting, confirmed ahead, everything. */
const managedQuery = (params: ManagedViewingsParams): Record<string, string | number | boolean> => ({
    page: params.page - 1,
    size: params.size,
    ...(params.view === 'requests'
        ? { status: 'REQUESTED', upcoming: true, sort: 'startsAt,asc' }
        : params.view === 'upcoming'
          ? { status: 'CONFIRMED', upcoming: true, sort: 'startsAt,asc' }
          : { sort: 'startsAt,desc' }),
});

export const viewingApi = {
    slots: async (listingId: string, from: string | undefined): Promise<ViewingSlots> =>
        (
            await apiClient.get<ViewingSlots>(`${BASE}/listings/${encode(listingId)}/viewing-slots`, {
                params: { days: SLOT_DAYS, ...(from === undefined ? {} : { from }) },
            })
        ).data,
    /** One Idempotency-Key per attempt from one opening of the form. */
    request: async (request: RequestViewingRequest, idempotencyKey: string): Promise<Viewing> =>
        (
            await apiClient.post<Viewing>(`${BASE}/viewings`, request, {
                headers: { 'Idempotency-Key': idempotencyKey },
            })
        ).data,
    listOwn: async (): Promise<Viewing[]> =>
        (await apiClient.get<{ content: Viewing[] }>(`${BASE}/viewings`)).data.content,
    find: async (id: string): Promise<Viewing> => (await apiClient.get<Viewing>(`${BASE}/viewings/${encode(id)}`)).data,
    confirm: async (id: string): Promise<Viewing> =>
        (await apiClient.post<Viewing>(`${BASE}/viewings/${encode(id)}/confirmation`, {})).data,
    decline: async (id: string, note: string | undefined): Promise<Viewing> =>
        (await apiClient.post<Viewing>(`${BASE}/viewings/${encode(id)}/declination`, note ? { note } : {})).data,
    cancel: async (id: string, note: string | undefined): Promise<Viewing> =>
        (await apiClient.post<Viewing>(`${BASE}/viewings/${encode(id)}/cancellation`, note ? { note } : {})).data,
    managedPage: async (params: ManagedViewingsParams): Promise<ViewingPage> =>
        (await apiClient.get<ViewingPage>(`${BASE}/managed-viewings`, { params: managedQuery(params) })).data,
    summary: async (): Promise<ViewingSummary> =>
        (await apiClient.get<ViewingSummary>(`${BASE}/managed-viewings/summary`)).data,
    listForListing: async (listingId: string): Promise<Viewing[]> =>
        (await apiClient.get<{ content: Viewing[] }>(`${BASE}/managed-listings/${encode(listingId)}/viewings`)).data
            .content,
    schedule: async (listingId: string): Promise<ViewingScheduleState> =>
        (await apiClient.get<ViewingScheduleState>(`${BASE}/managed-listings/${encode(listingId)}/viewing-schedule`))
            .data,
    saveSchedule: async (listingId: string, request: SaveViewingScheduleRequest): Promise<ViewingSchedule> =>
        (
            await apiClient.put<ViewingSchedule>(
                `${BASE}/managed-listings/${encode(listingId)}/viewing-schedule`,
                request,
            )
        ).data,
    removeSchedule: async (listingId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/managed-listings/${encode(listingId)}/viewing-schedule`);
    },
};
