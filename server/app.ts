import { Hono } from 'hono';
import type { Env, Variables } from './types';
import { attachSession, requireAdmin } from './middleware/auth';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

const app = new Hono<{ Bindings: Env; Variables: Variables }>().basePath('/api');

app.use('*', attachSession);

app.get('/health', (c) => c.json({ ok: true }));
app.get('/me', (c) => c.json({ user: c.get('user') ?? null }));

app.route('/auth', authRoutes);
app.use('/admin/*', requireAdmin);
app.route('/admin', adminRoutes);

export default app;
