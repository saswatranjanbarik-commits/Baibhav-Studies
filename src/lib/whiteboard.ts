/**
 * Live whiteboard (v1.5) — data, geometry and cloud storage.
 *
 * THE BOARD
 *   A fixed 1600 × 1000 drawing area. Every device scales it to fit its
 *   window, so a drawing looks the same on the laptop and the tablet.
 *
 * WHERE IT IS STORED
 *   Firestore document  appStore/whiteboard_<classId>_<page>
 *     { classId, page, strokes: { <strokeId>: WbStroke } }
 *   - One small document per page, separate from the main study data.
 *   - Covered by the existing appStore rule — no Firestore rules change.
 *   - Strokes are a map keyed by id: two people drawing at once never
 *     overwrite each other; erasing removes single strokes.
 *   - Which page everyone is on lives on the class board document
 *     (see setWhiteboardPage in classChat.ts).
 *   - Points are saved as a compact text ("x y x y …", whole numbers) so a
 *     page holds thousands of strokes within Firestore's 1 MB document limit.
 */
import { doc, onSnapshot, setDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { STORE_COLLECTION } from './storeKeys';
import { clean } from './classChat';

export const BOARD_W = 1600;
export const BOARD_H = 1000;

export type WbTool = 'pen' | 'highlighter' | 'line' | 'rect' | 'ellipse' | 'text';

export interface WbStroke {
  id: string;
  tool: WbTool;
  color: string;
  /** Line width (or text size) in board units. */
  width: number;
  /** "x y x y …" in board units. Shapes: start and end point. Text: top-left. */
  pts: string;
  text?: string;
  by: string;      // author email
  byName: string;
  at: string;      // ISO time
}

/** Stop a single stroke growing beyond this many points (a new one starts). */
export const MAX_POINTS_PER_STROKE = 1500;
/** Warn and stop drawing when a page's document gets close to 1 MB. */
export const PAGE_FULL_BYTES = 900_000;
/** Ignore pointer moves shorter than this (board units) — keeps strokes small. */
export const MIN_POINT_DISTANCE = 1.5;

export const WB_COLORS = ['#111827', '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed'];
export const WB_SIZES: Record<'S' | 'M' | 'L', { line: number; text: number }> = {
  S: { line: 3, text: 26 },
  M: { line: 6, text: 38 },
  L: { line: 12, text: 56 },
};

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

export function encodePoints(points: number[]): string {
  return points.map((n) => Math.round(n)).join(' ');
}

export function decodePoints(pts: string | undefined): number[] {
  if (!pts) return [];
  const out: number[] = [];
  for (const part of pts.split(' ')) {
    const n = Number(part);
    if (part !== '' && Number.isFinite(n)) out.push(n);
  }
  return out.length % 2 ? out.slice(0, -1) : out;
}

/** Keep a point inside the board. */
export function clampToBoard(x: number, y: number): [number, number] {
  return [Math.min(BOARD_W, Math.max(0, x)), Math.min(BOARD_H, Math.max(0, y))];
}

/** How the board fits a window: scale + offsets so it is centred ("contain"). */
export function fitBoard(width: number, height: number): { scale: number; ox: number; oy: number } {
  if (width <= 0 || height <= 0) return { scale: 1, ox: 0, oy: 0 };
  const scale = Math.min(width / BOARD_W, height / BOARD_H);
  return { scale, ox: (width - BOARD_W * scale) / 2, oy: (height - BOARD_H * scale) / 2 };
}

/** Distance from point P to segment AB. */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Rough box of a text stroke (for the eraser). */
function textBox(s: WbStroke, p: number[]) {
  const lines = (s.text || '').split('\n');
  const w = Math.max(...lines.map((l) => l.length)) * s.width * 0.6;
  return { x1: p[0], y1: p[1], x2: p[0] + w, y2: p[1] + lines.length * s.width * 1.2 };
}

/** Does the eraser at (x, y) with radius r touch this stroke? */
export function strokeHit(s: WbStroke, points: number[], x: number, y: number, r: number): boolean {
  if (points.length < 2) return false;
  const reach = r + (s.tool === 'highlighter' ? s.width * 1.5 : s.width / 2);
  if (s.tool === 'text') {
    const b = textBox(s, points);
    return x >= b.x1 - r && x <= b.x2 + r && y >= b.y1 - r && y <= b.y2 + r;
  }
  if (s.tool === 'rect' && points.length >= 4) {
    const [x1, y1, x2, y2] = points;
    const edges = [[x1, y1, x2, y1], [x2, y1, x2, y2], [x2, y2, x1, y2], [x1, y2, x1, y1]];
    return edges.some(([a, b, c, d]) => distToSegment(x, y, a, b, c, d) <= reach);
  }
  if (s.tool === 'ellipse' && points.length >= 4) {
    const [x1, y1, x2, y2] = points;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2 || 1, ry = Math.abs(y2 - y1) / 2 || 1;
    // distance from the outline, roughly, in board units
    const k = Math.hypot((x - cx) / rx, (y - cy) / ry);
    return Math.abs(k - 1) * Math.min(rx, ry) <= reach;
  }
  if (points.length === 2) return Math.hypot(x - points[0], y - points[1]) <= reach;
  for (let i = 0; i + 3 < points.length; i += 2) {
    if (distToSegment(x, y, points[i], points[i + 1], points[i + 2], points[i + 3]) <= reach) return true;
  }
  return false;
}

/** Approximate stored size of a page (bytes). */
export function estimatePageBytes(strokes: Record<string, WbStroke>): number {
  let total = 200;
  for (const s of Object.values(strokes)) total += 160 + (s.pts?.length || 0) + (s.text?.length || 0) + (s.byName?.length || 0) + (s.by?.length || 0);
  return total;
}

/** Strokes in drawing order (oldest first). */
export function orderedStrokes(strokes: Record<string, WbStroke>): WbStroke[] {
  return Object.values(strokes)
    .filter((s) => s && s.id && s.pts)
    .sort((a, b) => (a.at || '').localeCompare(b.at || '') || a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// Drawing (shared by the live board and the PNG download)
// ---------------------------------------------------------------------------

export function drawStroke(ctx: CanvasRenderingContext2D, s: WbStroke, p: number[]) {
  if (p.length < 2) return;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s.tool === 'highlighter' ? s.width * 3 : s.width;
  if (s.tool === 'highlighter') ctx.globalAlpha = 0.35;

  if (s.tool === 'text') {
    ctx.font = `${s.width}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    (s.text || '').split('\n').forEach((line, i) => ctx.fillText(line, p[0], p[1] + i * s.width * 1.2));
  } else if ((s.tool === 'rect' || s.tool === 'ellipse' || s.tool === 'line') && p.length >= 4) {
    const [x1, y1, x2, y2] = p;
    ctx.beginPath();
    if (s.tool === 'line') { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    else if (s.tool === 'rect') ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    else ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.length === 2) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    // smooth the line through the midpoints
    for (let i = 2; i + 3 < p.length; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2;
      const my = (p[i + 1] + p[i + 3]) / 2;
      ctx.quadraticCurveTo(p[i], p[i + 1], mx, my);
    }
    ctx.lineTo(p[p.length - 2], p[p.length - 1]);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Firestore access
// ---------------------------------------------------------------------------

const pageDocId = (classId: string, page: number) => `whiteboard_${classId}_${page}`;

export function listenToPage(
  classId: string,
  page: number,
  onData: (strokes: Record<string, WbStroke>) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, STORE_COLLECTION, pageDocId(classId, page)),
    (snap) => onData((snap.data()?.strokes as Record<string, WbStroke>) || {}),
    (err) => {
      console.warn('Whiteboard listener failed:', err);
      onError('Could not load the whiteboard. Check the internet connection.');
    },
  );
}

export async function addStroke(classId: string, page: number, stroke: WbStroke) {
  await setDoc(
    doc(db, STORE_COLLECTION, pageDocId(classId, page)),
    { classId, page, updatedAt: serverTimestamp(), strokes: { [stroke.id]: clean(stroke) } },
    { merge: true },
  );
}

export async function deleteStrokes(classId: string, page: number, ids: string[]) {
  if (!ids.length) return;
  const changes: Record<string, unknown> = { updatedAt: serverTimestamp() };
  ids.forEach((id) => { changes[`strokes.${id}`] = deleteField(); });
  await updateDoc(doc(db, STORE_COLLECTION, pageDocId(classId, page)), changes);
}

/** Wipe a page (tutor/admin only in the app). */
export async function clearPage(classId: string, page: number) {
  await setDoc(doc(db, STORE_COLLECTION, pageDocId(classId, page)), {
    classId, page, strokes: {}, clearedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
