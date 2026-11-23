import { DAYS_PER_WEEK } from '@/common/time/units';

/** A tenant keeps at most this many viewings ahead: enough to compare homes, not to block calendars. */
export const MAX_ACTIVE_VIEWINGS = 10;
/** Slots are listed this many days at a time (the client pages by `from`). */
export const MAX_SLOT_DAYS = 14;
export const DEFAULT_SLOT_DAYS = DAYS_PER_WEEK;
/** A tenant's list is unpaged: a person has a handful of viewings, never hundreds. */
export const MAX_OWN_VIEWINGS = 100;
/** One listing's upcoming viewings on its management page: a week or two of visits. */
export const MAX_LISTING_VIEWINGS = 50;
/** API-22: a tenant's export lists their latest viewings, at most this many. */
export const MAX_EXPORTED_VIEWINGS = 500;
