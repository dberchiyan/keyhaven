/** A message is a note, not a document; the column is sized the same (`viewing_messages.body`). */
export const MAX_MESSAGE_LENGTH = 2000;
/** One conversation is read whole (no paging in a chat): a cap keeps that read bounded. */
export const MAX_THREAD_MESSAGES = 500;
/** The inbox is unpaged: a person has a few dozen viewings at most; admins see the latest hundred. */
export const MAX_CONVERSATIONS = 100;
/** How much of a message the inbox row and the email show. */
export const PREVIEW_LENGTH = 140;
