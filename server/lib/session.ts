import type { Env, Session } from '../types';

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

export async function createSession(db: Env['DB'], userId: string): Promise<Session> {
  const session: Session = {
    id: crypto.randomUUID(),
    user_id: userId,
    expires_at: Date.now() + SESSION_DURATION_MS,
  };
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(session.id, session.user_id, session.expires_at)
    .run();
  return session;
}

export async function deleteSession(db: Env['DB'], sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

export async function touchSession(db: Env['DB'], sessionId: string): Promise<void> {
  await db
    .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
    .bind(Date.now() + SESSION_DURATION_MS, sessionId)
    .run();
}
