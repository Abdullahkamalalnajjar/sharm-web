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

const isAuthCall = (url?: string) => url?.startsWith('/identity/token') ?? false;

http.interceptors.request.use(async (config) => {
  if (isAuthCall(config.url)) return config;
  const token = await freshAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<Tokens | null> | null = null;

/**
 * New tokens, or null. The refresh token is single-use, so only one refresh runs at a time:
 * within this tab (one shared promise) and across tabs (a Web Lock; the tabs share localStorage).
 */
function tryRefresh(): Promise<Tokens | null> {
  const used = tokenStorage.read()?.accessToken;
  const locked = async (): Promise<Tokens | null> =>
    navigator.locks ? navigator.locks.request('sharm.token-refresh', () => refresh(used)) : refresh(used);
  refreshing ??= locked().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * The session ends only when the server rejects the refresh token (4xx);
 * a network error or server fault keeps it for the next attempt.
 */
async function refresh(used: string | undefined): Promise<Tokens | null> {
  const current = tokenStorage.read();
  if (!current) return null;
  // Another tab refreshed while this one waited for the lock.
  if (current.accessToken !== used) return current;
  try {
    const res = await axios.post<Envelope<Tokens>>(
      `${baseURL}/identity/token/refresh-token`,
      { accessToken: current.accessToken, refreshToken: current.refreshToken },
      { timeout: 20_000 },
    );
    const tokens = res.data.value;
    tokenStorage.save(tokens);
    return tokens;
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    if (status !== undefined && status >= 400 && status < 500) {
      tokenStorage.clear();
      onSessionExpired?.();
    }
    return null;
  }
}

/** Seconds-since-epoch expiry of a JWT, or null when it cannot be read. */
function tokenExpiry(jwt: string): number | null {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = (JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

/**
 * A current access token, refreshed first when it expires within a minute. If the refresh
 * cannot reach the server, the current token is returned as it is.
 */
export async function freshAccessToken(): Promise<string | null> {
  const current = tokenStorage.read();
  if (!current) return null;
  const exp = tokenExpiry(current.accessToken);
  if (exp !== null && exp * 1000 > Date.now() + 60_000) return current.accessToken;
  return (await tryRefresh())?.accessToken ?? tokenStorage.read()?.accessToken ?? null;
}

/** Where the API lives ('' = same origin, through the dev proxy). */
export const apiBaseUrl = baseURL;

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  const status = error.response?.status;
  const sent = config?.headers?.Authorization as string | undefined;

  // 401: access token expired. 403: permissions live in the token, so a token issued
  // before a permission was granted needs a fresh one.
  if (config && (status === 401 || status === 403) && sent && !isAuthCall(config.url) && !config._retried) {
    // Another request (or tab) may already have refreshed while this one was in flight.
    const stored = tokenStorage.read();
    const refreshed = stored && `Bearer ${stored.accessToken}` !== sent ? stored : await tryRefresh();
    if (refreshed) {
      config._retried = true;
      config.headers = { ...config.headers, Authorization: `Bearer ${refreshed.accessToken}` };
      return http.request(config);
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
