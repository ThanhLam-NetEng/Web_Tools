import type { ReactNode } from 'react';

const PAGE_WIDTH_PX = 794; // 210mm at 96dpi
const PAGE_HEIGHT_PX = 1123; // 297mm at 96dpi
const SCALE = 0.6;

interface Props {
  children: ReactNode;
}

export function CvPreviewFrame({ children }: Props) {
  return (
    <div
      className="cv-preview-frame"
      style={{ width: PAGE_WIDTH_PX * SCALE, height: PAGE_HEIGHT_PX * SCALE }}
    >
      <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: PAGE_WIDTH_PX }}>
        {children}
      </div>
    </div>
  );
}
