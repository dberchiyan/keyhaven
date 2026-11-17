export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_SUBJECT_LENGTH = 120;
/** One conversation is read whole (no paging in a chat): a cap keeps that read bounded. */
export const MAX_THREAD_MESSAGES = 500;
/** The inbox is unpaged: a person has a few dozen conversations at most; admins see the latest hundred. */
export const MAX_CONVERSATIONS = 100;
/** A member keeps at most this many support requests open at once (close one by getting an answer). */
export const MAX_OPEN_SUPPORT = 5;
export const PREVIEW_LENGTH = 140;
/** API-22: a person's export lists the newest messages they wrote, at most this many. */
export const MAX_EXPORTED_MESSAGES = 2000;
/** API-22: a person's export lists the newest requests they opened with Keyhaven, at most this many. */
export const MAX_EXPORTED_CONVERSATIONS = 100;
