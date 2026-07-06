import type { CSSProperties } from 'react';
import type { CvData } from '../../shared/cv';
import { ACCENT_COLORS, DEFAULT_FONT_SIZE_PT, FONT_FAMILIES } from '../../shared/cv';
import './ClassicProfessional.css';

interface Props {
  data: CvData;
}

export function ClassicProfessional({ data }: Props) {
  const accent = ACCENT_COLORS.find((a) => a.id === data.accentColor)?.hex ?? ACCENT_COLORS[0].hex;
  const fontSizePt = data.fontSizePt || DEFAULT_FONT_SIZE_PT;
  const fontFamily = FONT_FAMILIES.find((f) => f.id === data.fontFamily)?.css ?? FONT_FAMILIES[0].css;

  return (
    <div
      className="cv-classic"
      style={{ '--cv-accent': accent, fontSize: `${fontSizePt}pt`, fontFamily } as CSSProperties}
    >
      <header className="cv-classic-header">
        {data.avatarUrl && <img className="cv-classic-avatar" src={data.avatarUrl} alt="" />}
        <div>
          <h1>{data.fullName || 'Họ và tên'}</h1>
          <p className="cv-classic-title">{data.jobTitle || 'Chức danh'}</p>
          <p className="cv-classic-contact">{[data.email, data.phone, data.address].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

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
            <div className="cv-classic-item" key={exp.id}>
              <div className="cv-classic-item-head">
                <strong>{exp.role}</strong>
                <span>
                  {exp.startDate} – {exp.endDate}
                </span>
              </div>
              <p className="cv-classic-item-sub">{exp.company}</p>
              <p>{exp.description}</p>
            </div>
          ))}
        </section>
      )}

      {data.education.length > 0 && (
        <section>
          <h2>Học vấn</h2>
          {data.education.map((edu) => (
            <div className="cv-classic-item" key={edu.id}>
              <div className="cv-classic-item-head">
                <strong>{edu.degree}</strong>
                <span>
                  {edu.startDate} – {edu.endDate}
                </span>
              </div>
              <p className="cv-classic-item-sub">{edu.school}</p>
            </div>
          ))}
        </section>
      )}

      {data.skills.some((s) => s.trim()) && (
        <section>
          <h2>Kỹ năng</h2>
          <div className="cv-classic-skills">
            {data.skills
              .map((s) => s.trim())
              .filter(Boolean)
              .map((skill) => (
                <p key={skill}>{skill}</p>
              ))}
          </div>
        </section>
      )}

      {data.certificates.length > 0 && (
        <section>
          <h2>Chứng chỉ</h2>
          {data.certificates.map((cert) => (
            <div className="cv-classic-item" key={cert.id}>
              <div className="cv-classic-item-head">
                <strong>{cert.name}</strong>
                <span>{cert.date}</span>
              </div>
              <p className="cv-classic-item-sub">{cert.issuer}</p>
            </div>
          ))}
        </section>
      )}

      {data.languages.length > 0 && (
        <section>
          <h2>Ngôn ngữ</h2>
          <div className="cv-classic-skills">
            {data.languages.map((lang) => (
              <p key={lang.id}>
                {lang.name}
                {lang.level ? ` — ${lang.level}` : ''}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
