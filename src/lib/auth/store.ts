/**
 * Lightweight auth store helpers for SSR/CSR cookie persistence and RBAC checks.
 * These utilities avoid framework coupling; pages pass Astro.cookies in at callsites.
 */

import type { MeClaims } from './service';

export type CookiesWriter = {
  set: (name: string, value: string, options?: any) => void;
  delete: (name: string, options?: any) => void;
};

function isProd(): boolean {
  try {
    return Boolean(import.meta.env.PROD);
  } catch {}
  try {
    return (globalThis as any)?.process?.env?.NODE_ENV === 'production';
  } catch {}
  return false;
}

export function parseCookie(cookieHeader: string | undefined | null): Record<string, string> {
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

export function getAuthTokenFromCookiesHeader(cookieHeader?: string | null): string | null {
  const map = parseCookie(cookieHeader || '');
  return map['auth_token'] || null;
}

export function setAuthCookies(cookies: CookiesWriter, token: string, expiresInSeconds: number): { expiresAtISO: string } {
  const secure = isProd();
  const expiresAt = new Date(Date.now() + Math.max(1, expiresInSeconds) * 1000);
  const expiresAtISO = expiresAt.toISOString();

  // Persist httpOnly token; readable only by server
  cookies.set('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.max(1, expiresInSeconds),
    expires: expiresAt,
  });

  // Non-sensitive helper for UI (optional)
  cookies.set('auth_expires', expiresAtISO, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.max(1, expiresInSeconds),
    expires: expiresAt,
  });

  return { expiresAtISO };
}

export function clearAuthCookies(cookies: CookiesWriter): void {
  // Delete via Max-Age=0
  cookies.delete('auth_token', { path: '/' });
  cookies.delete('auth_expires', { path: '/' });
}

/**
 * RBAC helpers
 */
export function hasAnyRole(me: MeClaims | null | undefined, required: string[] = []): boolean {
  if (!me) return false;
  const roles = new Set((me.roles || []).filter(Boolean));
  return required.some((r) => roles.has(r));
}

export function hasAllRoles(me: MeClaims | null | undefined, required: string[] = []): boolean {
  if (!me) return false;
  const roles = new Set((me.roles || []).filter(Boolean));
  return required.every((r) => roles.has(r));
}

export function hasAnyGroup(me: MeClaims | null | undefined, required: string[] = []): boolean {
  if (!me) return false;
  const groups = new Set((me.groups || []).filter(Boolean));
  return required.some((g) => groups.has(g));
}

export function hasAllGroups(me: MeClaims | null | undefined, required: string[] = []): boolean {
  if (!me) return false;
  const groups = new Set((me.groups || []).filter(Boolean));
  return required.every((g) => groups.has(g));
}