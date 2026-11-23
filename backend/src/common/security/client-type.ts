export const ClientType = {
    WEB: 'web',
    MOBILE: 'mobile',
} as const;
export type ClientType = (typeof ClientType)[keyof typeof ClientType];
