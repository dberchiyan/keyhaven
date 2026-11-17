import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import i18n from 'i18next';

import { env } from '@/shared/config/env';
import type { ErrorCode, ErrorResponse } from '@/shared/types';

import { markApiActivity } from './activity';
import { ApiError } from './api-error';
import { HTTP_STATUS } from './http-status';
import { checkResponseContract } from './response-contract';

const TIMEOUT_MS = 15_000;
const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'X-XSRF-TOKEN';
const SAFE_METHODS = new Set(['get', 'head', 'options']);
const SESSION_ERRORS: ReadonlySet<ErrorCode> = new Set(['UNAUTHORIZED', 'SESSION_EXPIRED']);

const readCookie = (name: string): string | undefined =>
    document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${name}=`))
        ?.slice(name.length + 1);

const isErrorResponse = (data: unknown): data is ErrorResponse =>
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    'status' in data &&
    'message' in data &&
    typeof data.error === 'string' &&
    typeof data.status === 'number' &&
    typeof data.message === 'string';

type SessionLostHandler = (code: ErrorCode, config: InternalAxiosRequestConfig | undefined) => void;

const sessionLost: { handler: SessionLostHandler | undefined } = { handler: undefined };

/**
 * Registered once by the app shell, because the shared client cannot import the app: a 401
 * mid-session clears the cache and goes to sign-in (NAV-3).
 */
export const setSessionLostHandler = (handler: SessionLostHandler): void => {
    sessionLost.handler = handler;
};

export const apiClient = axios.create({
    baseURL: env.VITE_API_BASE_URL,
    withCredentials: true,
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
    config.headers.set('Accept-Language', i18n.resolvedLanguage ?? i18n.language);
    if (!SAFE_METHODS.has((config.method ?? 'get').toLowerCase())) {
        const csrfToken = readCookie(CSRF_COOKIE);
        if (csrfToken) {
            config.headers.set(CSRF_HEADER, decodeURIComponent(csrfToken));
        }
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        markApiActivity();
        return checkResponseContract(response);
    },
    (error: unknown) => {
        if (!(error instanceof AxiosError)) {
            return Promise.reject(error instanceof Error ? error : new Error('Unknown error'));
        }
        const data: unknown = error.response?.data;
        if (!error.response || !isErrorResponse(data)) {
            const status = error.response?.status ?? 0;
            const code: ErrorCode = status === 0 ? 'UPSTREAM_UNAVAILABLE' : 'INTERNAL_ERROR';
            return Promise.reject(new ApiError(status, code, i18n.t(`errors:${code}`), [], undefined));
        }
        const apiError = ApiError.fromResponse(data);
        if (apiError.status === HTTP_STATUS.UNAUTHORIZED && SESSION_ERRORS.has(apiError.code)) {
            sessionLost.handler?.(apiError.code, error.config);
        }
        return Promise.reject(apiError);
    },
);
