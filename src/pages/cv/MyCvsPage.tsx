import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import type { CvDocumentSummary } from '../../../shared/cv';
import { TEMPLATES } from '../../templates';
import './cv-pages.css';

export function MyCvsPage() {
  const [docs, setDocs] = useState<CvDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await api.get<CvDocumentSummary[]>('/cv'));
    } catch {
      setError('Không tải được danh sách CV.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!window.confirm('Xoá CV này?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/cv/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xoá thất bại.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p>Đang tải…</p>;

  return (
    <div>
      <div className="cv-list-header">
        <h2>CV của tôi</h2>
        <Link to="/app/cv/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          + Tạo CV mới
        </Link>
      </div>
      {error && <p className="error-text">{error}</p>}
      {docs.length === 0 && <p style={{ color: 'var(--mist)' }}>Chưa có CV nào.</p>}
      <div className="cv-list">
        {docs.map((doc) => (
          <div className="card cv-list-item" key={doc.id}>
            <div>
              <h3>{doc.fullName || '(Chưa đặt tên)'}</h3>
              <p style={{ color: 'var(--mist)' }}>{doc.jobTitle}</p>
              <p style={{ color: 'var(--mist)', fontSize: '0.8rem' }}>
                {TEMPLATES[doc.templateId].label} · Cập nhật {new Date(doc.updatedAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="cv-list-actions">
              <Link to={`/app/cv/${doc.id}`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                Mở
              </Link>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deletingId === doc.id}
                onClick={() => void handleDelete(doc.id)}
              >
                Xoá
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
