export const TokenPurpose = {
    EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
    PASSWORD_RESET: 'PASSWORD_RESET',
} as const;
export type TokenPurpose = (typeof TokenPurpose)[keyof typeof TokenPurpose];
