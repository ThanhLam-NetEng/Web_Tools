import { useEffect, useRef, useState, type ReactNode } from 'react';

const PAGE_WIDTH_PX = 794; // 210mm at 96dpi
const PAGE_HEIGHT_PX = 1123; // 297mm at 96dpi
const MAX_SCALE = 0.78;

interface Props {
  children: ReactNode;
}

// Co giãn theo chiều rộng thật của khung chứa (ResizeObserver) thay vì 1 scale
// cố định, để vừa khít trên mọi kích thước màn hình — máy tính, tablet, điện thoại.
export function CvPreviewFrame({ children }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MAX_SCALE);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      setScale(Math.min(MAX_SCALE, width / PAGE_WIDTH_PX));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="cv-preview-frame-outer">
      <div className="cv-preview-frame" style={{ width: PAGE_WIDTH_PX * scale, height: PAGE_HEIGHT_PX * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PAGE_WIDTH_PX }}>
          {children}
        </div>
      </div>
    </div>
  );
}
