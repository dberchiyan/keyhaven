export const JobName = {
    DELETE_EXPIRED_IDEMPOTENCY_KEYS: 'idempotency.delete-expired',
    DELETE_EXPIRED_SESSIONS: 'session.delete-expired',
    DELETE_EXPIRED_ACCOUNT_TOKENS: 'account-token.delete-expired',
    DELETE_EXPIRED_PHOTO_INTENTS: 'listing-photo.delete-expired-intents',
    EXPIRE_UNANSWERED_VIEWINGS: 'viewing.expire-unanswered',
    REMIND_UPCOMING_VIEWINGS: 'viewing.remind-upcoming',
    SEND_SAVED_SEARCH_DIGESTS: 'saved-search.send-digests',
} as const;
export type JobName = (typeof JobName)[keyof typeof JobName];
export const JOB_NAMES = Object.values(JobName) as [JobName, ...JobName[]];
