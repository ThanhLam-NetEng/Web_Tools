import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const admin = new Hono<{ Bindings: Env; Variables: Variables }>();

async function countAdmins(db: Env['DB']): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) as n FROM users WHERE role = 'admin'`).first<{ n: number }>();
  return row?.n ?? 0;
}

async function deleteUserCascade(db: Env['DB'], userId: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM cv_documents WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
}

admin.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC',
  ).all();
  return c.json(results);
});

admin.post('/users/:id/approve', async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(`UPDATE users SET status = 'active' WHERE id = ? AND status = 'pending'`)
    .bind(id)
    .run();
  if (result.meta.changes === 0) return c.json({ error: 'user not pending' }, 400);
  return c.json({ ok: true });
});

admin.post('/users/:id/reject', async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB.prepare('SELECT status FROM users WHERE id = ?').bind(id).first<{ status: string }>();
  if (!user) return c.json({ error: 'not found' }, 404);
  if (user.status !== 'pending') return c.json({ error: 'user not pending' }, 400);
  await deleteUserCascade(c.env.DB, id);
  return c.json({ ok: true });
});

admin.post('/users/:id/suspend', async (c) => {
  const id = c.req.param('id');
  const actor = c.get('user');
  if (!actor) return c.json({ error: 'unauthorized' }, 401);
  if (id === actor.id) return c.json({ error: 'cannot suspend yourself' }, 400);

  const result = await c.env.DB.prepare(`UPDATE users SET status = 'suspended' WHERE id = ? AND status = 'active'`)
    .bind(id)
    .run();
  if (result.meta.changes === 0) return c.json({ error: 'user not active' }, 400);
  return c.json({ ok: true });
});

admin.post('/users/:id/unsuspend', async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(`UPDATE users SET status = 'active' WHERE id = ? AND status = 'suspended'`)
    .bind(id)
    .run();
  if (result.meta.changes === 0) return c.json({ error: 'user not suspended' }, 400);
  return c.json({ ok: true });
});

admin.post('/users/:id/role', async (c) => {
  const id = c.req.param('id');
  const actor = c.get('user');
  if (!actor) return c.json({ error: 'unauthorized' }, 401);
  if (id === actor.id) return c.json({ error: 'cannot change your own role' }, 400);

  const body = await c.req.json().catch(() => null);
  const role = body?.role;
  if (role !== 'admin' && role !== 'user') return c.json({ error: 'invalid role' }, 400);

  const target = await c.env.DB.prepare('SELECT role, status FROM users WHERE id = ?')
    .bind(id)
    .first<{ role: string; status: string }>();
  if (!target) return c.json({ error: 'not found' }, 404);
  if (target.status !== 'active') return c.json({ error: 'user not active' }, 400);

  if (target.role === 'admin' && role === 'user') {
    const admins = await countAdmins(c.env.DB);
    if (admins <= 1) return c.json({ error: 'cannot demote the last admin' }, 400);
  }

  await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
  return c.json({ ok: true });
});

admin.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const actor = c.get('user');
  if (!actor) return c.json({ error: 'unauthorized' }, 401);
  if (id === actor.id) return c.json({ error: 'cannot delete yourself' }, 400);

  const target = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(id).first<{ role: string }>();
  if (!target) return c.json({ error: 'not found' }, 404);

  if (target.role === 'admin') {
    const admins = await countAdmins(c.env.DB);
    if (admins <= 1) return c.json({ error: 'cannot delete the last admin' }, 400);
  }

  await deleteUserCascade(c.env.DB, id);
  return c.json({ ok: true });
});

export default admin;
