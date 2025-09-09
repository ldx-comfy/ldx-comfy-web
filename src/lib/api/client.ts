/**
 * Unified API client for server/browser with JWT and 401 handling.
 */

import { API_BASE_URL } from '../../config/env';

export class AuthError extends Error {
  status: number;
  constructor(message = 'Unauthorized', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type ApiContext = {
  cookies?: string;              // cookies string from SSR request headers
  redirectOn401?: boolean;       // browser only: whether to auto redirect to login on 401
};

type PrimitiveBody = string | number | boolean | Record<string, any> | Array<any> | null | undefined;

function isFormData(v: any): v is FormData {
  return typeof FormData !== 'undefined' && v instanceof FormData;
}

function isBlob(v: any): v is Blob {
  return typeof Blob !== 'undefined' && v instanceof Blob;
}

function parseCookie(cookieHeader: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = decodeURIComponent(p.slice(0, idx).trim());
    const v = decodeURIComponent(p.slice(idx + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

function getTokenFromCookies(cookies?: string): string | null {
  const map = parseCookie(cookies || '');
  return map['auth_token'] || map['auth_token_js'] || null;
}

function getBrowserCookies(): string {
  try {
    if (typeof document !== 'undefined') return document.cookie || '';
  } catch {}
  return '';
}

function currentPathWithQuery(): string {
  try {
    if (typeof window !== 'undefined') {
      const { pathname, search } = window.location;
      return `${pathname}${search}`;
    }
  } catch {}
  return '/';
}

function clearAuthCookiesOnBrowser(): void {
  try {
    if (typeof document !== 'undefined') {
      document.cookie = 'auth_token=; Max-Age=0; Path=/';
      document.cookie = 'auth_expires=; Max-Age=0; Path=/';
    }
  } catch {}
}

function redirectToLogin(next?: string): void {
  try {
    if (typeof window !== 'undefined') {
      const qs = next ? `?next=${encodeURIComponent(next)}` : '';
      window.location.assign(`/login${qs}`);
    }
  } catch {}
}

function joinUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
}

export type ApiFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: any;
  ctx?: ApiContext;
  rawResponse?: boolean;
};

async function handle401(ctx?: ApiContext): Promise<never> {
  if (typeof window !== 'undefined') {
    const should = ctx?.redirectOn401 ?? true;
    if (should) {
      clearAuthCookiesOnBrowser();
      redirectToLogin(currentPathWithQuery());
    }
  }
  throw new AuthError('Unauthorized', 401);
}

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const base = API_BASE_URL;
  const url = joinUrl(base, path);
  const method = (options.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const token =
    getTokenFromCookies(options.ctx?.cookies) ||
    getTokenFromCookies(getBrowserCookies());

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body: any = options.body;
  if (body != null && !isFormData(body) && !isBlob(body) && typeof body !== 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(body as PrimitiveBody);
  }

  const resp = await fetch(url, { method, headers, body });

  if (resp.status === 401) {
    return handle401(options.ctx);
  }

  if (!resp.ok) {
    let msg = `HTTP ${resp.status} ${resp.statusText}`;
    try {
      const text = await resp.text();
      if (text) msg += ` Body: ${text.slice(0, 1000)}`;
    } catch {}
    const err = new ApiError(msg, resp.status);
    throw err;
  }

  if (options.rawResponse) {
    // @ts-ignore
    return resp as any;
  }

  if (resp.status === 204) {
    // @ts-ignore
    return null as any;
  }

  const ctype = resp.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
    return (await resp.json()) as T;
  }
  // Fallback to text
  // @ts-ignore
  return (await resp.text()) as any;
}

export async function apiGet<T = any>(path: string, ctx?: ApiContext): Promise<T> {
  return apiFetch<T>(path, { method: 'GET', ctx });
}

export async function apiPost<T = any>(path: string, data?: any, ctx?: ApiContext): Promise<T> {
  const opts: ApiFetchOptions = { method: 'POST', body: data, ctx };
  return apiFetch<T>(path, opts);
}

export function toBackendAbsoluteUrl(urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const base = API_BASE_URL.replace(/\/api\/v1$/, '');
  const p = urlOrPath.replace(/^\/+/, '');
  return `${base}/${p}`;
}