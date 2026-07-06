import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

// Render `element` (phải là bản full-size, không scale) thành ảnh rồi cắt theo
// từng trang A4 nhét vào jsPDF. Cắt cứng theo pixel nên có thể ngắt giữa dòng
// chữ ở ranh giới trang — chấp nhận được cho CV thường 1 trang, hiếm khi tràn 2 trang.
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const pxPerMm = canvas.width / PAGE_WIDTH_MM;
  const pageHeightPx = PAGE_HEIGHT_MM * pxPerMm;

  // Bỏ qua phần dư nhỏ hơn ngưỡng này (sai số làm tròn scale/canvas) để tránh
  // sinh ra 1 trang gần như trắng khi nội dung dài đúng bằng số trang nguyên.
  const MIN_TRAILING_PX = 4 * pxPerMm;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let renderedPx = 0;
  let pageIndex = 0;

  while (canvas.height - renderedPx > MIN_TRAILING_PX) {
    if (pageIndex > 0) doc.addPage();
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const sliceData = pageCanvas.toDataURL('image/jpeg', 0.92);
    const sliceHeightMm = sliceHeightPx / pxPerMm;
    doc.addImage(sliceData, 'JPEG', 0, 0, PAGE_WIDTH_MM, sliceHeightMm);

    renderedPx += sliceHeightPx;
    pageIndex++;
  }

  doc.save(filename);
}
