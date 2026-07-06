import type { CSSProperties } from 'react';
import type { CvData } from '../../shared/cv';
import { ACCENT_COLORS, FONT_FAMILIES, FONT_SIZES } from '../../shared/cv';
import './ModernTwoColumn.css';

interface Props {
  data: CvData;
}

export function ModernTwoColumn({ data }: Props) {
  const accent = ACCENT_COLORS.find((a) => a.id === data.accentColor)?.hex ?? ACCENT_COLORS[0].hex;
  const fontSizePt = FONT_SIZES.find((f) => f.id === data.fontSize)?.pt ?? FONT_SIZES[1].pt;
  const fontFamily = FONT_FAMILIES.find((f) => f.id === data.fontFamily)?.css ?? FONT_FAMILIES[0].css;

  return (
    <div
      className="cv-modern"
      style={{ '--cv-accent': accent, fontSize: `${fontSizePt}pt`, fontFamily } as CSSProperties}
    >
      <aside className="cv-modern-side">
        {data.avatarUrl && <img className="cv-modern-avatar" src={data.avatarUrl} alt="" />}
        <h1>{data.fullName || 'Họ và tên'}</h1>
        <p className="cv-modern-title">{data.jobTitle || 'Chức danh'}</p>

        <section>
          <h2>Liên hệ</h2>
          {data.email && <p>{data.email}</p>}
          {data.phone && <p>{data.phone}</p>}
          {data.address && <p>{data.address}</p>}
        </section>

        {data.skills.some((s) => s.trim()) && (
          <section>
            <h2>Kỹ năng</h2>
            <ul>
              {data.skills
                .map((s) => s.trim())
                .filter(Boolean)
                .map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
            </ul>
          </section>
        )}

        {data.languages.length > 0 && (
          <section>
            <h2>Ngôn ngữ</h2>
            {data.languages.map((lang) => (
              <p key={lang.id}>
                {lang.name} — {lang.level}
              </p>
            ))}
          </section>
        )}
      </aside>

      <main className="cv-modern-main">
        {data.summary && (
          <section>
            <h2>Tóm tắt</h2>
            <p>{data.summary}</p>
          </section>
        )}

        {data.experience.length > 0 && (
          <section>
            <h2>Kinh nghiệm</h2>
            {data.experience.map((exp) => (
              <div className="cv-modern-item" key={exp.id}>
                <div className="cv-modern-item-head">
                  <strong>{exp.role}</strong>
                  <span>
                    {exp.startDate} – {exp.endDate}
                  </span>
                </div>
                <p className="cv-modern-item-sub">{exp.company}</p>
                <p>{exp.description}</p>
              </div>
            ))}
          </section>
        )}

        {data.education.length > 0 && (
          <section>
            <h2>Học vấn</h2>
            {data.education.map((edu) => (
              <div className="cv-modern-item" key={edu.id}>
                <div className="cv-modern-item-head">
                  <strong>{edu.degree}</strong>
                  <span>
                    {edu.startDate} – {edu.endDate}
                  </span>
                </div>
                <p className="cv-modern-item-sub">{edu.school}</p>
              </div>
            ))}
          </section>
        )}

        {data.certificates.length > 0 && (
          <section>
            <h2>Chứng chỉ</h2>
            {data.certificates.map((cert) => (
              <div className="cv-modern-item" key={cert.id}>
                <div className="cv-modern-item-head">
                  <strong>{cert.name}</strong>
                  <span>{cert.date}</span>
                </div>
                <p className="cv-modern-item-sub">{cert.issuer}</p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
