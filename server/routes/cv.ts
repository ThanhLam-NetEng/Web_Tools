import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { createEmptyCvData, type CvData, type CvDocumentFull, type CvDocumentSummary, type TemplateId } from '../../shared/cv';

const cv = new Hono<{ Bindings: Env; Variables: Variables }>();

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png']);

interface CvRow {
  id: string;
  template_id: string;
  data_json: string;
  updated_at: number;
}

function isTemplateId(value: unknown): value is TemplateId {
  return value === 'classic-professional' || value === 'modern-two-column';
}

function toSummary(row: CvRow): CvDocumentSummary {
  const data = JSON.parse(row.data_json) as CvData;
  return {
    id: row.id,
    templateId: row.template_id as TemplateId,
    fullName: data.fullName,
    jobTitle: data.jobTitle,
    updatedAt: row.updated_at,
  };
}

function toFull(row: CvRow): CvDocumentFull {
  const data = JSON.parse(row.data_json) as CvData;
  return {
    id: row.id,
    templateId: row.template_id as TemplateId,
    fullName: data.fullName,
    jobTitle: data.jobTitle,
    updatedAt: row.updated_at,
    data,
  };
}

cv.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const { results } = await c.env.DB.prepare(
    'SELECT id, template_id, data_json, updated_at FROM cv_documents WHERE user_id = ? ORDER BY updated_at DESC',
  )
    .bind(user.id)
    .all<CvRow>();

  return c.json(results.map(toSummary));
});

cv.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json().catch(() => null);
  const templateId = (body as { templateId?: unknown } | null)?.templateId;
  if (!isTemplateId(templateId)) return c.json({ error: 'invalid templateId' }, 400);

  const id = crypto.randomUUID();
  const data = createEmptyCvData(templateId);
  const now = Date.now();

  await c.env.DB.prepare(
    'INSERT INTO cv_documents (id, user_id, template_id, data_json, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, user.id, templateId, JSON.stringify(data), now)
    .run();

  const full: CvDocumentFull = { id, templateId, fullName: '', jobTitle: '', updatedAt: now, data };
  return c.json(full, 201);
});

cv.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const row = await c.env.DB.prepare(
    'SELECT id, template_id, data_json, updated_at FROM cv_documents WHERE id = ? AND user_id = ?',
  )
    .bind(c.req.param('id'), user.id)
    .first<CvRow>();

  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(toFull(row));
});

cv.put('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json().catch(() => null);
  const data = (body as { data?: CvData } | null)?.data;
  if (!data || !isTemplateId(data.templateId)) return c.json({ error: 'invalid data' }, 400);

  const now = Date.now();
  const result = await c.env.DB.prepare(
    'UPDATE cv_documents SET data_json = ?, template_id = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(JSON.stringify(data), data.templateId, now, c.req.param('id'), user.id)
    .run();

  if (result.meta.changes === 0) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true, updatedAt: now });
});

cv.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const result = await c.env.DB.prepare('DELETE FROM cv_documents WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id)
    .run();

  if (result.meta.changes === 0) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

cv.post('/upload-avatar', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const contentType = c.req.header('content-type') ?? '';
  if (!ALLOWED_AVATAR_TYPES.has(contentType)) {
    return c.json({ error: 'chỉ nhận JPG/PNG' }, 400);
  }

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: 'file rỗng' }, 400);
  if (body.byteLength > MAX_AVATAR_BYTES) return c.json({ error: 'ảnh vượt quá 2MB' }, 400);

  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const key = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;

  await c.env.AVATARS.put(key, body, { httpMetadata: { contentType } });

  return c.json({ url: `/api/cv/avatar/${key}` }, 201);
});

cv.get('/avatar/:key{.+}', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const key = c.req.param('key');
  const object = await c.env.AVATARS.get(key);
  if (!object) return c.json({ error: 'not found' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=86400',
    },
  });
});

export default cv;
