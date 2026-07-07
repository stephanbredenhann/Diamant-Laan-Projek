export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  await document.fonts.ready;

  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const margin = 10;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
  const imgH = (canvas.height * pageW) / canvas.width;
  const drawH = Math.min(imgH, pageH);
  const drawW = (canvas.width * drawH) / canvas.height;
  const x = margin + (pageW - drawW) / 2;
  const y = margin + (pageH - drawH) / 2;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
  pdf.save(filename);
}
