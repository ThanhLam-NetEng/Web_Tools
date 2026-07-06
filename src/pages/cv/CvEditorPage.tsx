import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, uploadAvatar } from '../../lib/api';
import { cropToSquareJpeg } from '../../lib/image';
import type {
  CvCertificate,
  CvData,
  CvDocumentFull,
  CvEducation,
  CvExperience,
  CvLanguage,
} from '../../../shared/cv';
import { ACCENT_COLORS } from '../../../shared/cv';
import { TEMPLATES } from '../../templates';
import { CvPreviewFrame } from '../../components/CvPreviewFrame';
import './cv-pages.css';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png'];

const STEPS = ['Thông tin cá nhân', 'Học vấn', 'Kinh nghiệm', 'Kỹ năng & Chứng chỉ'];

function uid(): string {
  return crypto.randomUUID();
}

interface StepProps {
  data: CvData;
  patch: (fields: Partial<CvData>) => void;
}

export function CvEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const exportRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<CvData | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<CvDocumentFull>(`/cv/${id}`)
      .then((doc) => setData(doc.data))
      .catch(() => setError('Không tải được CV.'))
      .finally(() => setLoading(false));
  }, [id]);

  function patch(fields: Partial<CvData>) {
    setData((prev) => (prev ? { ...prev, ...fields } : prev));
  }

  async function handleSave() {
    if (!data || !id) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/cv/${id}`, { data });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    if (!data || !exportRef.current) return;
    setExporting(true);
    setError(null);
    try {
      const { exportElementToPdf } = await import('../../lib/exportPdf');
      await exportElementToPdf(exportRef.current, `${data.fullName || 'cv'}.pdf`);
    } catch {
      setError('Xuất PDF thất bại, thử lại.');
    } finally {
      setExporting(false);
    }
  }

  if (loading || !data) return <p>Đang tải…</p>;

  const Template = TEMPLATES[data.templateId].component;

  return (
    <div className="cv-editor">
      <div className="cv-editor-form">
        <div className="cv-editor-steps">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`cv-editor-step-btn${i === step ? ' active' : ''}`}
              onClick={() => setStep(i)}
            >
              {label}
            </button>
          ))}
        </div>

        {step === 0 && <PersonalStep data={data} patch={patch} />}
        {step === 1 && <EducationStep data={data} patch={patch} />}
        {step === 2 && <ExperienceStep data={data} patch={patch} />}
        {step === 3 && <SkillsStep data={data} patch={patch} />}

        {error && <p className="error-text">{error}</p>}

        <div className="cv-editor-actions">
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={exporting} onClick={() => void handleExportPdf()}>
            {exporting ? 'Đang xuất…' : 'Xuất PDF'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/app/cv')}>
            Về danh sách CV
          </button>
          {savedAt && (
            <span style={{ color: 'var(--mist)', fontSize: '0.85rem', alignSelf: 'center' }}>
              Đã lưu lúc {new Date(savedAt).toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
      </div>

      <div className="cv-editor-preview">
        <CvPreviewFrame>
          <Template data={data} />
        </CvPreviewFrame>
      </div>

      {/* Bản full-size không scale, ẩn khỏi mắt nhưng vẫn render đầy đủ để html2canvas chụp khi xuất PDF */}
      <div style={{ position: 'absolute', top: 0, left: 0, height: 0, overflow: 'hidden' }}>
        <div ref={exportRef}>
          <Template data={data} />
        </div>
      </div>
    </div>
  );
}

function PersonalStep({ data, patch }: StepProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Chỉ nhận ảnh JPG hoặc PNG.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Ảnh vượt quá 2MB.');
      return;
    }

    setAvatarError(null);
    setUploading(true);
    try {
      const cropped = await cropToSquareJpeg(file);
      const { url } = await uploadAvatar(cropped);
      patch({ avatarUrl: url });
    } catch {
      setAvatarError('Upload ảnh thất bại, thử lại.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="field">
        <label>Ảnh đại diện (tùy chọn, JPG/PNG, tối đa 2MB)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {data.avatarUrl && (
            <img
              src={data.avatarUrl}
              alt=""
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <input type="file" accept="image/jpeg,image/png" disabled={uploading} onChange={(e) => void handleAvatarChange(e)} />
          {uploading && <span style={{ color: 'var(--mist)', fontSize: '0.85rem' }}>Đang tải…</span>}
          {data.avatarUrl && !uploading && (
            <button type="button" className="btn btn-ghost" onClick={() => patch({ avatarUrl: null })}>
              Xoá ảnh
            </button>
          )}
        </div>
        {avatarError && <p className="error-text">{avatarError}</p>}
      </div>

      <div className="accent-picker">
        {ACCENT_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`accent-swatch${data.accentColor === c.id ? ' selected' : ''}`}
            style={{ background: c.hex }}
            title={c.label}
            onClick={() => patch({ accentColor: c.id })}
          />
        ))}
      </div>
      <div className="field">
        <label>Họ và tên</label>
        <input value={data.fullName} onChange={(e) => patch({ fullName: e.target.value })} />
      </div>
      <div className="field">
        <label>Chức danh</label>
        <input value={data.jobTitle} onChange={(e) => patch({ jobTitle: e.target.value })} />
      </div>
      <div className="cv-editor-row">
        <div className="field">
          <label>Email</label>
          <input value={data.email} onChange={(e) => patch({ email: e.target.value })} />
        </div>
        <div className="field">
          <label>Điện thoại</label>
          <input value={data.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>Địa chỉ</label>
        <input value={data.address} onChange={(e) => patch({ address: e.target.value })} />
      </div>
      <div className="field">
        <label>Tóm tắt</label>
        <textarea rows={6} value={data.summary} onChange={(e) => patch({ summary: e.target.value })} />
      </div>
    </div>
  );
}

function EducationStep({ data, patch }: StepProps) {
  function update(id: string, fields: Partial<CvEducation>) {
    patch({ education: data.education.map((e) => (e.id === id ? { ...e, ...fields } : e)) });
  }
  function add() {
    patch({ education: [...data.education, { id: uid(), school: '', degree: '', startDate: '', endDate: '' }] });
  }
  function remove(id: string) {
    patch({ education: data.education.filter((e) => e.id !== id) });
  }

  return (
    <div>
      {data.education.map((edu) => (
        <div className="cv-repeat-item" key={edu.id}>
          <button type="button" className="btn btn-ghost cv-repeat-remove" onClick={() => remove(edu.id)}>
            Xoá
          </button>
          <div className="field">
            <label>Trường</label>
            <input value={edu.school} onChange={(e) => update(edu.id, { school: e.target.value })} />
          </div>
          <div className="field">
            <label>Bằng cấp</label>
            <input value={edu.degree} onChange={(e) => update(edu.id, { degree: e.target.value })} />
          </div>
          <div className="cv-editor-row">
            <div className="field">
              <label>Từ</label>
              <input
                value={edu.startDate}
                onChange={(e) => update(edu.id, { startDate: e.target.value })}
                placeholder="2018"
              />
            </div>
            <div className="field">
              <label>Đến</label>
              <input
                value={edu.endDate}
                onChange={(e) => update(edu.id, { endDate: e.target.value })}
                placeholder="2022"
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={add}>
        + Thêm học vấn
      </button>
    </div>
  );
}

function ExperienceStep({ data, patch }: StepProps) {
  function update(id: string, fields: Partial<CvExperience>) {
    patch({ experience: data.experience.map((e) => (e.id === id ? { ...e, ...fields } : e)) });
  }
  function add() {
    patch({
      experience: [
        ...data.experience,
        { id: uid(), company: '', role: '', startDate: '', endDate: '', description: '' },
      ],
    });
  }
  function remove(id: string) {
    patch({ experience: data.experience.filter((e) => e.id !== id) });
  }

  return (
    <div>
      {data.experience.map((exp) => (
        <div className="cv-repeat-item" key={exp.id}>
          <button type="button" className="btn btn-ghost cv-repeat-remove" onClick={() => remove(exp.id)}>
            Xoá
          </button>
          <div className="field">
            <label>Công ty</label>
            <input value={exp.company} onChange={(e) => update(exp.id, { company: e.target.value })} />
          </div>
          <div className="field">
            <label>Vị trí</label>
            <input value={exp.role} onChange={(e) => update(exp.id, { role: e.target.value })} />
          </div>
          <div className="cv-editor-row">
            <div className="field">
              <label>Từ</label>
              <input
                value={exp.startDate}
                onChange={(e) => update(exp.id, { startDate: e.target.value })}
                placeholder="2021"
              />
            </div>
            <div className="field">
              <label>Đến</label>
              <input
                value={exp.endDate}
                onChange={(e) => update(exp.id, { endDate: e.target.value })}
                placeholder="Hiện tại"
              />
            </div>
          </div>
          <div className="field">
            <label>Mô tả</label>
            <textarea
              rows={5}
              value={exp.description}
              onChange={(e) => update(exp.id, { description: e.target.value })}
            />
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={add}>
        + Thêm kinh nghiệm
      </button>
    </div>
  );
}

function SkillsStep({ data, patch }: StepProps) {
  function updateCert(id: string, fields: Partial<CvCertificate>) {
    patch({ certificates: data.certificates.map((c) => (c.id === id ? { ...c, ...fields } : c)) });
  }
  function addCert() {
    patch({ certificates: [...data.certificates, { id: uid(), name: '', issuer: '', date: '' }] });
  }
  function removeCert(id: string) {
    patch({ certificates: data.certificates.filter((c) => c.id !== id) });
  }

  function updateLang(id: string, fields: Partial<CvLanguage>) {
    patch({ languages: data.languages.map((l) => (l.id === id ? { ...l, ...fields } : l)) });
  }
  function addLang() {
    patch({ languages: [...data.languages, { id: uid(), name: '', level: '' }] });
  }
  function removeLang(id: string) {
    patch({ languages: data.languages.filter((l) => l.id !== id) });
  }

  return (
    <div>
      <div className="field">
        <label>Kỹ năng (mỗi dòng 1 kỹ năng)</label>
        <textarea
          rows={8}
          value={data.skills.join('\n')}
          onChange={(e) => patch({ skills: e.target.value.split('\n') })}
        />
      </div>

      <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.6rem' }}>Chứng chỉ</h3>
      {data.certificates.map((cert) => (
        <div className="cv-repeat-item" key={cert.id}>
          <button type="button" className="btn btn-ghost cv-repeat-remove" onClick={() => removeCert(cert.id)}>
            Xoá
          </button>
          <div className="field">
            <label>Tên chứng chỉ</label>
            <input value={cert.name} onChange={(e) => updateCert(cert.id, { name: e.target.value })} />
          </div>
          <div className="cv-editor-row">
            <div className="field">
              <label>Đơn vị cấp</label>
              <input value={cert.issuer} onChange={(e) => updateCert(cert.id, { issuer: e.target.value })} />
            </div>
            <div className="field">
              <label>Năm</label>
              <input value={cert.date} onChange={(e) => updateCert(cert.id, { date: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={addCert}>
        + Thêm chứng chỉ
      </button>

      <h3 style={{ fontSize: '1rem', margin: '1.4rem 0 0.6rem' }}>Ngôn ngữ</h3>
      {data.languages.map((lang) => (
        <div className="cv-repeat-item" key={lang.id}>
          <button type="button" className="btn btn-ghost cv-repeat-remove" onClick={() => removeLang(lang.id)}>
            Xoá
          </button>
          <div className="cv-editor-row">
            <div className="field">
              <label>Ngôn ngữ</label>
              <input value={lang.name} onChange={(e) => updateLang(lang.id, { name: e.target.value })} />
            </div>
            <div className="field">
              <label>Mức độ</label>
              <input
                value={lang.level}
                onChange={(e) => updateLang(lang.id, { level: e.target.value })}
                placeholder="Thành thạo"
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={addLang}>
        + Thêm ngôn ngữ
      </button>
    </div>
  );
}
