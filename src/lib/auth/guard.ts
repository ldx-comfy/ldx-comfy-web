/**
 * SSR guard utilities for Astro pages and middleware helpers.
 */
import { getMe, type MeClaims } from './service';
import { getAuthTokenFromCookiesHeader } from './store';

export type GuardResult = {
  me?: MeClaims | null;
  response?: Response | null;
};

function makeRedirect(requestUrl: string, targetPath: string): Response {
  const url = new URL(targetPath, requestUrl);
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() },
  });
}

export async function requireAuthSSR(requestUrl: string, cookieHeader?: string | null): Promise<Response | null> {
  const token = getAuthTokenFromCookiesHeader(cookieHeader);
  if (!token) {
    const next = encodeURIComponent(new URL(requestUrl).pathname + new URL(requestUrl).search);
    return makeRedirect(requestUrl, `/login?next=${next}`);
  }
  return null;
}

export async function ensureMeSSR(requestUrl: string, cookieHeader?: string | null): Promise<GuardResult> {
  const redirect = await requireAuthSSR(requestUrl, cookieHeader);
  if (redirect) return { me: null, response: redirect };
  try {
    const me = await getMe({ cookies: cookieHeader || undefined });
    return { me, response: null };
  } catch {
    const next = encodeURIComponent(new URL(requestUrl).pathname + new URL(requestUrl).search);
    return { me: null, response: makeRedirect(requestUrl, `/login?next=${next}`) };
  }
}

function hasAll(required: string[] | undefined | null, actual: string[] | undefined | null): boolean {
  if (!required || required.length === 0) return true;
  const set = new Set(actual || []);
  return required.every((r) => set.has(r));
}

function hasAny(required: string[] | undefined | null, actual: string[] | undefined | null): boolean {
  if (!required || required.length === 0) return true;
  const set = new Set(actual || []);
  return required.some((r) => set.has(r));
}

export async function requireRolesSSR(
  requestUrl: string,
  cookieHeader: string | undefined | null,
  options: { all?: string[]; any?: string[] } = {}
): Promise<GuardResult> {
  const basic = await ensureMeSSR(requestUrl, cookieHeader);
  if (basic.response) return basic;
  const me = basic.me!;
  const ok = hasAll(options.all, me.roles) && hasAny(options.any, me.roles);
  if (!ok) {
    return { me, response: new Response('Forbidden', { status: 403 }) };
  }
  return { me, response: null };
}

export async function requireGroupsSSR(
  requestUrl: string,
  cookieHeader: string | undefined | null,
  options: { all?: string[]; any?: string[] } = {}
): Promise<GuardResult> {
  const basic = await ensureMeSSR(requestUrl, cookieHeader);
  if (basic.response) return basic;
  const me = basic.me!;
  const ok = hasAll(options.all, me.groups) && hasAny(options.any, me.groups);
  if (!ok) {
    return { me, response: new Response('Forbidden', { status: 403 }) };
  }
  return { me, response: null };
}