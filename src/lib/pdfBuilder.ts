/**
 * Tiny PDF builder (v1.5) — puts scanned JPEG pages into one PDF file, in the
 * browser, with no library. Each page is A4 width; the page height follows
 * the photo so nothing is squashed. The JPEGs are used as they are (already
 * compressed), so the PDF is about the same size as the pages.
 */

export interface PdfImage { jpegBase64: string; width: number; height: number }

const A4_WIDTH_PT = 595.28;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Build the PDF bytes. */
export function buildPdf(images: PdfImage[], title = 'EduTrack scan'): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObj = (n: number) => { offsets[n] = length; push(`${n} 0 obj\n`); };

  // Object numbers: 1 catalog, 2 pages, 3 info, then 3 per page (page, content, image)
  const pageObj = (i: number) => 4 + i * 3;
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n'); // second line marks the file as binary

  startObj(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObj(2);
  push(`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>\nendobj\n`);
  const safeTitle = title.replace(/[^\x20-\x7e]|[()\\]/g, ' ').slice(0, 100);
  startObj(3); push(`<< /Title (${safeTitle}) /Producer (Dugu EduTrack) >>\nendobj\n`);

  images.forEach((img, i) => {
    const w = A4_WIDTH_PT;
    const h = Math.round((A4_WIDTH_PT * img.height) / Math.max(1, img.width) * 100) / 100;
    const p = pageObj(i), c = p + 1, im = p + 2;
    startObj(p);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${c} 0 R >>\nendobj\n`);
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
    startObj(c); push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    const jpeg = base64ToBytes(img.jpegBase64);
    startObj(im);
    push(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push('\nendstream\nendobj\n');
  });

  const count = 4 + images.length * 3;
  const xrefAt = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const ch of chunks) { out.set(ch, pos); pos += ch.length; }
  return out;
}
