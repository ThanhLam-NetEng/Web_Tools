import type { ComponentType } from 'react';
import type { CvData, TemplateId } from '../../shared/cv';
import { ClassicProfessional } from './ClassicProfessional';
import { ModernTwoColumn } from './ModernTwoColumn';

export const TEMPLATES: Record<TemplateId, { label: string; component: ComponentType<{ data: CvData }> }> = {
  'classic-professional': { label: 'Classic Professional', component: ClassicProfessional },
  'modern-two-column': { label: 'Modern Two-Column', component: ModernTwoColumn },
};
