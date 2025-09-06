/**
 * Auth service: login (password/code), fetch current identity, and helpers.
 */

import { apiGet, apiPost, type ApiContext } from '../api/client';

export type TokenResponse = {
  access_token: string;
  token_type: 'bearer';
  expires_in: number; // seconds
};

export type MeClaims = {
  sub: string;
  login_mode: 'password' | 'code' | string;
  iat: number;
  exp: number;
  roles?: string[];
  groups?: string[];
  // allow additional claims
  [k: string]: any;
};

export type AuthResult = {
  token: string;
  expires_in: number;
  me: MeClaims;
};

function ctxFromToken(token: string): ApiContext {
  // Reuse cookie-based auth in api client by forging a cookies string
  return { cookies: `auth_token=${encodeURIComponent(token)}` };
}

export async function loginPassword(username: string, password: string): Promise<AuthResult> {
  const t = await apiPost<TokenResponse>('/auth/login', { username, password });
  const me = await getMe(ctxFromToken(t.access_token));
  return { token: t.access_token, expires_in: t.expires_in, me };
}

export async function loginCode(code: string): Promise<AuthResult> {
  const t = await apiPost<TokenResponse>('/auth/code', { code });
  const me = await getMe(ctxFromToken(t.access_token));
  return { token: t.access_token, expires_in: t.expires_in, me };
}

export async function getMe(ctx?: ApiContext): Promise<MeClaims> {
  return apiGet<MeClaims>('/auth/me', ctx);
}

// Optional: helper to verify admin access
export async function pingAdmin(ctx?: ApiContext): Promise<{ ok: boolean; sub?: string }> {
  return apiGet<{ ok: boolean; sub?: string }>('/auth/admin/ping', ctx);
}