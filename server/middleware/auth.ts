import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, Variables, AuthUser } from '../types';
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS, touchSession } from '../lib/session';

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

function isHttps(c: AppContext): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

export function setSessionCookie(c: AppContext, sessionId: string): void {
  setCookie(c, SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export function clearSessionCookie(c: AppContext): void {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
}

interface SessionRow {
  id: string;
  email: string;
  role: AuthUser['role'];
  status: AuthUser['status'];
  expires_at: number;
}

// Đọc cookie session (nếu có) và gắn user vào context. Không chặn request nào ở
// đây — requireAuth/requireActive/requireAdmin bên dưới mới là nơi chặn.
export async function attachSession(c: AppContext, next: Next): Promise<void> {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return next();

  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.role, u.status, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
  )
    .bind(sessionId)
    .first<SessionRow>();

  if (!row || row.expires_at < Date.now()) {
    clearSessionCookie(c);
    return next();
  }

  c.set('user', { id: row.id, email: row.email, role: row.role, status: row.status });
  await touchSession(c.env.DB, sessionId);
  return next();
}

export async function requireAuth(c: AppContext, next: Next) {
  if (!c.get('user')) return c.json({ error: 'unauthorized' }, 401);
  return next();
}

export async function requireActive(c: AppContext, next: Next) {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  if (user.status !== 'active') return c.json({ error: 'account not active' }, 403);
  return next();
}

export async function requireAdmin(c: AppContext, next: Next) {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  if (user.role !== 'admin' || user.status !== 'active') return c.json({ error: 'forbidden' }, 403);
  return next();
}
