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
import { Quad, quadSize, warpQuad, detectPage } from './scanGeometry';
import { buildPdf } from './pdfBuilder';

export type ScanMode = 'document' | 'photo';

export interface ScanPage {
  id: string;
  kind: 'image' | 'pdf' | 'audio';
  mime: string;              // image/jpeg | application/pdf | audio/webm …
  data: string;              // data URL (joined from its parts when loaded)
  width?: number;
  height?: number;
  bytes: number;             // length of data
  name?: string;             // original file name (PDF / audio)
  durationSec?: number;      // audio length
  /** v1.5: big files are split over several documents (scan_<id>__1 …). */
  parts?: number;
  by: string;
  byName: string;
  at: string;
  context?: { type: 'task' | 'class'; id: string };
}

/** Stay well under Firestore's 1 MiB per-document limit. */
export const MAX_DATA_CHARS = 900_000;
/**
 * Largest file (as text) — split over up to 10 documents. ≈ 6.5 MB file:
 * a long audio recording or a bigger PDF.
 */
export const MAX_FILE_CHARS = MAX_DATA_CHARS * 10;
/** Longest audio recording (seconds). */
export const MAX_AUDIO_SECONDS = 10 * 60;
/** Longest side of a saved page (pixels) — sharp enough to read handwriting. */
export const MAX_SIDE = 1700; // default; see SCAN_SIZES
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

/** Page sizes the student can choose (longest side in pixels). */
export const SCAN_SIZES = { small: 1200, standard: 1700, sharp: 2200 } as const;
export type ScanSize = keyof typeof SCAN_SIZES;

/** Corners as fractions (0–1) of the rotated photo: TL, TR, BR, BL. */
export type NormQuad = [[number, number], [number, number], [number, number], [number, number]];

export interface RenderOptions {
  rotation: number;          // 0 / 90 / 180 / 270
  mode: ScanMode;
  corners?: NormQuad | null; // page corners → straightened ("aligned")
  size?: ScanSize;
}

/** The photo, rotated, at most `maxSide` pixels — as a canvas. */
export function rotatedCanvas(img: HTMLImageElement, rotation: number, maxSide: number): HTMLCanvasElement {
  const { w, h } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxSide);
  const turned = rotation % 180 !== 0;
  const c = document.createElement('canvas');
  c.width = turned ? h : w;
  c.height = turned ? w : h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return c;
}

/** Guess the page corners in the photo (null = couldn't tell). */
export function autoDetectCorners(img: HTMLImageElement, rotation: number): NormQuad | null {
  const small = rotatedCanvas(img, rotation, 256);
  const ctx = small.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, small.width, small.height);
  const gray = new Uint8Array(small.width * small.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) gray[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  const q = detectPage(gray, small.width, small.height);
  if (!q) return null;
  return q.map(([x, y]) => [x / small.width, y / small.height]) as NormQuad;
}

/**
 * Make the final page: rotate, straighten to the chosen corners, clean up
 * (document mode), resize, and compress to fit one Firestore document.
 */
export function renderPage(img: HTMLImageElement, opts: RenderOptions): { data: string; width: number; height: number } {
  const maxSide = SCAN_SIZES[opts.size || 'standard'];
  // Work from a slightly larger copy so straightening keeps detail.
  const src = rotatedCanvas(img, opts.rotation, Math.round(maxSide * 1.25));
  let page: HTMLCanvasElement;
  if (opts.corners) {
    const q = opts.corners.map(([x, y]) => [x * src.width, y * src.height]) as Quad;
    const natural = quadSize(q);
    const { w, h } = fitSize(Math.max(2, natural.w), Math.max(2, natural.h), maxSide);
    const pixels = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data;
    page = document.createElement('canvas');
    page.width = w;
    page.height = h;
    const pctx = page.getContext('2d')!;
    const flat = pctx.createImageData(w, h);
    flat.data.set(warpQuad(pixels, src.width, src.height, q, w, h));
    pctx.putImageData(flat, 0, 0);
  } else {
    const { w, h } = fitSize(src.width, src.height, maxSide);
    page = document.createElement('canvas');
    page.width = w;
    page.height = h;
    page.getContext('2d')!.drawImage(src, 0, 0, w, h);
  }
  if (opts.mode === 'document') {
    const ctx = page.getContext('2d')!;
    const data = ctx.getImageData(0, 0, page.width, page.height);
    enhanceDocument(data.data);
    ctx.putImageData(data, 0, 0);
  }
  // Compress until it fits: lower quality first, then make it smaller.
  let quality = opts.mode === 'document' ? 0.7 : 0.75;
  let canvas = page;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > MAX_DATA_CHARS && canvas.width > 300) {
    if (quality > 0.45) quality -= 0.1;
    else {
      const smaller = document.createElement('canvas');
      smaller.width = Math.round(canvas.width * 0.8);
      smaller.height = Math.round(canvas.height * 0.8);
      smaller.getContext('2d')!.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      canvas = smaller;
    }
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return { data: out, width: canvas.width, height: canvas.height };
}

/** Read a file (PDF, audio) as a data URL — up to about 6.5 MB. */
export function readFileData(file: Blob, name = 'The file'): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const data = String(r.result || '');
      if (data.length > MAX_FILE_CHARS) reject(new Error(`"${name}" is too large (max about 6 MB). Share it as a Google Drive link instead.`));
      else resolve(data);
    };
    r.onerror = () => reject(new Error(`${name} could not be read.`));
    r.readAsDataURL(file);
  });
}

/** Read a PDF file as a data URL. */
export function readPdf(file: File): Promise<string> {
  return readFileData(file, file.name);
}

/** Split text into pieces of at most `size` characters. */
export function splitIntoParts(text: string, size = MAX_DATA_CHARS): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts.length ? parts : [''];
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
const partRef = (id: string, i: number) => doc(db, STORE_COLLECTION, `scan_${id}__${i}`);
const cache = new Map<string, ScanPage>();

/**
 * Save one page/file. Files bigger than one document are split: the extra
 * pieces are saved first (scan_<id>__1, __2 …), then the main document with
 * the first piece and `parts`, so a file is only "there" when complete.
 */
export async function saveScanPage(page: ScanPage): Promise<void> {
  const pieces = splitIntoParts(page.data);
  for (let i = 1; i < pieces.length; i++) {
    await setDoc(partRef(page.id, i), { id: page.id, index: i, data: pieces[i] });
  }
  const clean: any = { ...page, data: pieces[0], parts: pieces.length > 1 ? pieces.length : undefined };
  Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
  await setDoc(scanRef(page.id), clean);
  cache.set(page.id, { ...page, parts: pieces.length > 1 ? pieces.length : undefined });
}

/** Load one page/file, joining its pieces (kept in memory after the first time). */
export async function loadScanPage(id: string): Promise<ScanPage | null> {
  if (cache.has(id)) return cache.get(id)!;
  const snap = await getDoc(scanRef(id));
  if (!snap.exists()) return null;
  const page = snap.data() as ScanPage;
  if (page.parts && page.parts > 1) {
    const rest = await Promise.all(
      Array.from({ length: page.parts - 1 }, (_, k) => getDoc(partRef(id, k + 1)).then((d) => (d.data()?.data as string) || '')),
    );
    page.data = page.data + rest.join('');
  }
  cache.set(id, page);
  return page;
}

/** Delete pages/files with all their pieces (best effort). */
export async function deleteScanPages(ids: string[] | undefined): Promise<void> {
  await Promise.all((ids || []).map(async (id) => {
    let parts = cache.get(id)?.parts;
    if (parts === undefined) {
      try { parts = ((await getDoc(scanRef(id))).data()?.parts as number | undefined) || 1; } catch { parts = 1; }
    }
    cache.delete(id);
    const refs = [scanRef(id), ...Array.from({ length: Math.max(0, (parts || 1) - 1) }, (_, k) => partRef(id, k + 1))];
    await Promise.all(refs.map((r) => deleteDoc(r).catch((e) => console.warn('Could not delete scan', id, e))));
  }));
}

/**
 * Put scanned pages into ONE PDF and download it (made on the device; the
 * stored pages stay as they are). Uploaded PDF files and audio recordings are
 * downloaded as they are.
 */
export async function downloadPagesAsPdf(scanIds: string[], fileName: string): Promise<number> {
  const pages = (await Promise.all(scanIds.map((id) => loadScanPage(id).catch(() => null)))).filter(Boolean) as ScanPage[];
  const safe = fileName.replace(/[^\w\- ]+/g, '').trim() || 'scan';
  const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  const images = pages.filter((p) => p.kind === 'image');
  if (images.length) {
    const bytes = buildPdf(images.map((p) => ({ jpegBase64: p.data.split(',')[1] || '', width: p.width || 1000, height: p.height || 1400 })), safe);
    save(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), `${safe}.pdf`);
  }
  pages.filter((p) => p.kind === 'pdf').forEach((p, i) => save(dataUrlToBlob(p.data), p.name || `${safe}-file-${i + 1}.pdf`));
  // v1.5: audio recordings are downloaded as they are (alongside the PDF)
  pages.filter((p) => p.kind === 'audio').forEach((p, i) => save(dataUrlToBlob(p.data), p.name || `${safe}-audio-${i + 1}.webm`));
  return pages.length;
}
