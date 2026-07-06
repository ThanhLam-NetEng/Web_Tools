import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { TEMPLATES } from '../../templates';
import type { CvDocumentFull, TemplateId } from '../../../shared/cv';
import './cv-pages.css';

export function TemplatePickerPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState<TemplateId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(templateId: TemplateId) {
    setCreating(templateId);
    setError(null);
    try {
      const doc = await api.post<CvDocumentFull>('/cv', { templateId });
      navigate(`/app/cv/${doc.id}`, { replace: true });
    } catch {
      setError('Không tạo được CV mới, thử lại.');
      setCreating(null);
    }
  }

  return (
    <div>
      <h2>Chọn mẫu CV</h2>
      {error && <p className="error-text">{error}</p>}
      <div className="template-grid">
        {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
          <div key={id} className="card template-card">
            <h3>{TEMPLATES[id].label}</h3>
            <button
              type="button"
              className="btn btn-primary"
              disabled={creating !== null}
              onClick={() => void handlePick(id)}
            >
              {creating === id ? 'Đang tạo…' : 'Chọn mẫu này'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
