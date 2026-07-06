import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, Variables } from '../types';
import { hashPassword, verifyPassword } from '../lib/password';
import { createSession, deleteSession, SESSION_COOKIE_NAME } from '../lib/session';
import { setSessionCookie, clearSessionCookie } from '../middleware/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// Hash chạy timing-equalize khi email không tồn tại, để không lộ qua thời gian phản hồi
// việc email đã đăng ký hay chưa.
const DUMMY_HASH = 'pbkdf2$50000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
}

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!EMAIL_RE.test(email)) return c.json({ error: 'invalid email' }, 400);
  if (password.length < MIN_PASSWORD_LENGTH) {
    return c.json({ error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
  }

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();

  try {
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, role, status, created_at) VALUES (?, ?, ?, 'user', 'pending', ?)`,
    )
      .bind(id, email, passwordHash, Date.now())
      .run();
  } catch {
    return c.json({ error: 'email already registered' }, 409);
  }

  return c.json({ status: 'pending' }, 201);
});

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const user = await c.env.DB.prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?')
    .bind(email)
    .first<UserRow>();

  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return c.json({ error: 'invalid credentials' }, 401);
  }

  if (!(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'invalid credentials' }, 401);
  }

  if (user.status !== 'active') {
    return c.json({ error: 'account not active', status: user.status }, 403);
  }

  const session = await createSession(c.env.DB, user.id);
  setSessionCookie(c, session.id);

  return c.json({ id: user.id, email: user.email, role: user.role, status: user.status });
});

auth.post('/logout', async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionId) await deleteSession(c.env.DB, sessionId);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

export default auth;
