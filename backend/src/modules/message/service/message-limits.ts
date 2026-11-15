/** A message is a note, not a document; the column is sized the same (`messages.body`). */
export const MAX_MESSAGE_LENGTH = 2000;
/** A support request's subject: one line (`conversations.subject`). */
export const MAX_SUBJECT_LENGTH = 120;
/** One conversation is read whole (no paging in a chat): a cap keeps that read bounded. */
export const MAX_THREAD_MESSAGES = 500;
/** The inbox is unpaged: a person has a few dozen conversations at most; admins see the latest hundred. */
export const MAX_CONVERSATIONS = 100;
/** A member keeps at most this many support requests open at once (close one by getting an answer). */
export const MAX_OPEN_SUPPORT = 5;
/** How much of a message the inbox row and the email show. */
export const PREVIEW_LENGTH = 140;
