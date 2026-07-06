import { Hono } from 'hono';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.get('/health', (c) => c.json({ ok: true }));

export default app;
