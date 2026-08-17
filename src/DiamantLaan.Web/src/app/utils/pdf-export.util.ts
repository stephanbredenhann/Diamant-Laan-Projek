/** A4 at 96dpi. The receipt sheet is laid out at exactly this size. */
const SHEET_W = 794;
const SHEET_H = 1123;

/**
 * Renders a full-page A4 sheet to PDF, drawn edge to edge like the certificate.
 * The element is expected to be SHEET_W x SHEET_H; anything else is scaled to
 * fill the page, so callers must lay out at A4 proportions.
 */
export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  await document.fonts.ready;

  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    width: SHEET_W,
    height: SHEET_H,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(
    canvas.toDataURL('image/jpeg', 0.92),
    'JPEG',
    0, 0,
    pdf.internal.pageSize.getWidth(),
    pdf.internal.pageSize.getHeight(),
  );
  pdf.save(filename);
}
