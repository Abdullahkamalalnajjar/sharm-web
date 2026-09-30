import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import type { Tokens } from '@/types';

const STORAGE_KEY = 'sharm.tokens';

/** Tokens live in localStorage so a refresh keeps the session. */
export const tokenStorage = {
  read(): Tokens | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  save(tokens: Tokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

export interface ApiErrorItem {
  code: string;
  description: string;
  type: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly errors: ApiErrorItem[] = [],
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> {
  isSuccess: boolean;
  value: T;
  errors?: ApiErrorItem[];
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

const http = axios.create({ baseURL, timeout: 20_000, headers: { 'Content-Type': 'application/json' } });

/** Called when the refresh token is no longer valid, so the app can log out. */
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

http.interceptors.request.use((config) => {
  const tokens = tokenStorage.read();
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

let refreshing: Promise<Tokens | null> | null = null;

async function tryRefresh(): Promise<Tokens | null> {
  const current = tokenStorage.read();
  if (!current) return null;
  refreshing ??= axios
    .post<Envelope<Tokens>>(`${baseURL}/identity/token/refresh-token`, {
      accessToken: current.accessToken,
      refreshToken: current.refreshToken,
    })
    .then((res) => {
      const tokens = res.data.value;
      tokenStorage.save(tokens);
      return tokens;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  const status = error.response?.status;
  const hadToken = Boolean(config?.headers?.Authorization);
  const isAuthCall = config?.url?.startsWith('/identity/token') ?? false;

  // 401: access token expired. 403: permissions live in the token, so a token issued
  // before a permission was granted needs a fresh one.
  if (config && (status === 401 || status === 403) && hadToken && !isAuthCall && !config._retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      config._retried = true;
      config.headers = { ...config.headers, Authorization: `Bearer ${refreshed.accessToken}` };
      return http.request(config);
    }
    if (status === 401) {
      tokenStorage.clear();
      onSessionExpired?.();
    }
  }
  throw error;
});

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as Partial<Envelope<unknown>> | undefined;
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    if (errors.length) {
      return new ApiError(errors.map((x) => x.description).join('\n'), errors, e.response?.status);
    }
    if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') return new ApiError('السيرفر اتأخر في الرد.');
    if (!e.response) return new ApiError('تعذر الاتصال بالسيرفر. تأكد إن الـ API شغال.');
    if (e.response.status === 403) return new ApiError('مش مسموح لك بالعملية دي.', [], 403);
    if (e.response.status === 401) return new ApiError('سجّل دخول الأول.', [], 401);
    return new ApiError('حصل خطأ غير متوقع.', [], e.response.status);
  }
  return new ApiError(e instanceof Error ? e.message : 'حصل خطأ غير متوقع.');
}

/** Unwraps the backend `Result<T>` envelope (`{ isSuccess, value, errors }`). */
async function send<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await http.request<Envelope<T> | T>(config);
    const data = res.data as Envelope<T> | T;
    if (data && typeof data === 'object' && 'isSuccess' in data) return (data as Envelope<T>).value;
    return data as T;
  } catch (e) {
    throw toApiError(e);
  }
}

const clean = (query?: Record<string, unknown>) =>
  query && Object.fromEntries(Object.entries(query).filter(([, v]) => v != null));

export const api = {
  get: <T>(url: string, query?: Record<string, unknown>) => send<T>({ method: 'GET', url, params: clean(query) }),
  post: <T>(url: string, body?: unknown) => send<T>({ method: 'POST', url, data: body }),
  put: <T>(url: string, body?: unknown) => send<T>({ method: 'PUT', url, data: body }),
  patch: <T>(url: string, body?: unknown) => send<T>({ method: 'PATCH', url, data: body }),
  delete: <T>(url: string) => send<T>({ method: 'DELETE', url }),
  /** Uploads one file as multipart/form-data (field name "file"), with PUT. */
  upload: <T>(url: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return send<T>({ method: 'PUT', url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const errorMessage = (e: unknown): string => toApiError(e).message;
