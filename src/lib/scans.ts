/**
 * Scans (v1.5) — photos of handwritten work, stored for free in Firestore.
 *
 * WHY FIRESTORE (and not Firebase Storage)?
 *   Firebase file Storage needs the paid (Blaze) plan for new projects. To
 *   stay on the free plan, each page is shrunk and compressed in the browser
 *   (≈100–400 KB) and saved as ONE small Firestore document:
 *
 *     appStore/scan_<id>  { id, kind, mime, data (image as text), width, height,
 *                           bytes, name?, by, byName, at, context }
 *
 *   - Separate documents → the main study data (global_store) is untouched.
 *   - Covered by the existing appStore rule (registered users only).
 *   - Free tier: 1 GB of Firestore space ≈ several thousand pages.
 *
 * Tasks and class-board messages only keep the list of scan ids.
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { STORE_COLLECTION } from './storeKeys';

export type ScanMode = 'document' | 'photo';

export interface ScanPage {
  id: string;
  kind: 'image' | 'pdf';
  mime: string;              // image/jpeg | application/pdf
  data: string;              // data URL
  width?: number;
  height?: number;
  bytes: number;             // length of data
  name?: string;             // original file name (PDF)
  by: string;
  byName: string;
  at: string;
  context?: { type: 'task' | 'class'; id: string };
}

/** Stay well under Firestore's 1 MiB per-document limit. */
export const MAX_DATA_CHARS = 900_000;
/** Longest side of a saved page (pixels) — sharp enough to read handwriting. */
export const MAX_SIDE = 1700;
export const MAX_PAGES = 20;

export function newScanId(now = Date.now()): string {
  return `s${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Scale (w, h) so the longest side is at most `max`. */
export function fitSize(w: number, h: number, max = MAX_SIDE): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= max || longest <= 0) return { w: Math.round(w), h: Math.round(h) };
  const k = max / longest;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/**
 * "Document" clean-up: makes paper white and ink dark (like a scanner).
 * Finds the dark (5%) and light (90%) levels of the photo and stretches them
 * to black/white, in grey. Works in place on RGBA pixel data.
 */
export function enhanceDocument(px: Uint8ClampedArray): void {
  const hist = new Uint32Array(256);
  const n = px.length / 4;
  for (let i = 0; i < px.length; i += 4) {
    const l = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    hist[l | 0]++;
  }
  const level = (fraction: number) => {
    let acc = 0;
    const target = n * fraction;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) return v; }
    return 255;
  };
  const black = level(0.05);
  let white = level(0.9);
  if (white - black < 30) white = Math.min(255, black + 30); // nearly blank page: be gentle
  const scale = 255 / (white - black);
  for (let i = 0; i < px.length; i += 4) {
    const l = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    let v = (l - black) * scale;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    // slight curve: keeps pencil strokes visible, whitens the background
    v = 255 * Math.pow(v / 255, 1.25);
    px[i] = px[i + 1] = px[i + 2] = v;
  }
}

// ---------------------------------------------------------------------------
// Browser image handling
// ---------------------------------------------------------------------------

/** Load an image file (photo) into an <img>. */
export function loadImageFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This picture could not be opened.')); };
    img.src = url;
  });
}

/**
 * Draw the photo at a sensible size, rotated by `rotation` (0/90/180/270),
 * cleaned up in document mode, and compressed to fit one document.
 */
export function renderPage(img: HTMLImageElement, rotation: number, mode: ScanMode): { data: string; width: number; height: number } {
  let { w, h } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const turned = rotation % 180 !== 0;
  const canvas = document.createElement('canvas');
  const draw = (cw: number, ch: number) => {
    canvas.width = turned ? ch : cw;
    canvas.height = turned ? cw : ch;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    if (mode === 'document') {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      enhanceDocument(data.data);
      ctx.putImageData(data, 0, 0);
    }
  };
  draw(w, h);
  // Compress until it fits: lower quality first, then make it smaller.
  let quality = mode === 'document' ? 0.7 : 0.75;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > MAX_DATA_CHARS && w > 300) {
    if (quality > 0.45) quality -= 0.1;
    else { w = Math.round(w * 0.8); h = Math.round(h * 0.8); draw(w, h); }
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return { data: out, width: canvas.width, height: canvas.height };
}

/** Read a PDF file as a data URL (only small PDFs fit). */
export function readPdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const data = String(r.result || '');
      if (data.length > MAX_DATA_CHARS) reject(new Error(`"${file.name}" is too large (max about 650 KB). Scan the pages instead, or share it as a Google Drive link.`));
      else resolve(data);
    };
    r.onerror = () => reject(new Error('The PDF could not be read.'));
    r.readAsDataURL(file);
  });
}

/** Turn a data URL back into a file (for opening/downloading). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const bin = atob(body || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

const scanRef = (id: string) => doc(db, STORE_COLLECTION, `scan_${id}`);
const cache = new Map<string, ScanPage>();

export async function saveScanPage(page: ScanPage): Promise<void> {
  const clean: any = { ...page };
  Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
  await setDoc(scanRef(page.id), clean);
  cache.set(page.id, page);
}

/** Load one page (kept in memory after the first time). */
export async function loadScanPage(id: string): Promise<ScanPage | null> {
  if (cache.has(id)) return cache.get(id)!;
  const snap = await getDoc(scanRef(id));
  if (!snap.exists()) return null;
  const page = snap.data() as ScanPage;
  cache.set(id, page);
  return page;
}

/** Delete pages (best effort — used when a submission or message is removed). */
export async function deleteScanPages(ids: string[] | undefined): Promise<void> {
  await Promise.all((ids || []).map((id) => {
    cache.delete(id);
    return deleteDoc(scanRef(id)).catch((e) => console.warn('Could not delete scan', id, e));
  }));
}
