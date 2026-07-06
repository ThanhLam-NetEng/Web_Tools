export type TemplateId = 'classic-professional' | 'modern-two-column';

export type AccentColor = 'navy' | 'charcoal' | 'moss' | 'maroon' | 'slate';

export const ACCENT_COLORS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'navy', label: 'Navy', hex: '#1f3350' },
  { id: 'charcoal', label: 'Xám than', hex: '#33383f' },
  { id: 'moss', label: 'Xanh rêu', hex: '#3a4a35' },
  { id: 'maroon', label: 'Đỏ đô', hex: '#5c1f2e' },
  { id: 'slate', label: 'Xanh đá', hex: '#2c3e4a' },
];

export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SIZES: { id: FontSize; label: string; pt: number }[] = [
  { id: 'small', label: 'Nhỏ', pt: 9.5 },
  { id: 'medium', label: 'Vừa', pt: 10.5 },
  { id: 'large', label: 'Lớn', pt: 11.5 },
];

export interface CvExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CvEducation {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
}

export interface CvCertificate {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface CvLanguage {
  id: string;
  name: string;
  level: string;
}

export interface CvData {
  templateId: TemplateId;
  accentColor: AccentColor;
  fontSize: FontSize;
  avatarUrl: string | null;
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  summary: string;
  experience: CvExperience[];
  education: CvEducation[];
  skills: string[];
  certificates: CvCertificate[];
  languages: CvLanguage[];
}

export function createEmptyCvData(templateId: TemplateId): CvData {
  return {
    templateId,
    accentColor: 'navy',
    fontSize: 'medium',
    avatarUrl: null,
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certificates: [],
    languages: [],
  };
}

export interface CvDocumentSummary {
  id: string;
  templateId: TemplateId;
  fullName: string;
  jobTitle: string;
  updatedAt: number;
}

export interface CvDocumentFull extends CvDocumentSummary {
  data: CvData;
}
