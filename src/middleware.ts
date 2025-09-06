import type { MiddlewareHandler } from 'astro';

/**
 * Astro middleware: minimal auth gate for selected routes.
 * - Protect /me and /admin (and /admin/*) by checking presence of auth_token cookie.
 * - Do not call backend here to keep latency minimal; RBAC is enforced at page-level guards.
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  const req = context.request;
  const reqUrl = new URL(req.url);
  const path = reqUrl.pathname;

  const needAuth =
    path === '/me' ||
    path === '/me/' ||
    path === '/admin' ||
    path.startsWith('/admin/');

  if (!needAuth) {
    return next();
  }

  const cookie = req.headers.get('cookie') || '';
  const hasToken = /(^|;\s*)auth_token=/.test(cookie);

  if (!hasToken) {
    const nextParam = encodeURIComponent(reqUrl.pathname + reqUrl.search);
    const location = `/login?next=${nextParam}`;
    return new Response(null, {
      status: 302,
      headers: { Location: location },
    });
  }

  return next();
};