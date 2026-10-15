/**
 * Classroom layout (v1.5) — which windows are open in the class room and
 * how big they are.
 *
 *   Wide screens (laptop, tablet in landscape):
 *     ┌──────────────┬──────────┐
 *     │    Video     │ Learning │   mainRatio  = left column width share
 *     ├──────────────┼──────────┤   stageRatio = Video height share of the left column
 *     │  Whiteboard  │ Questions│   sideRatio  = Learning height share of the right column
 *     └──────────────┴──────────┘
 *   Narrow screens (phone, tablet in portrait): Video/Whiteboard on top and
 *   Learning/Questions below, each pair as tabs (mainRatio = top height share).
 *
 * Saved on THIS DEVICE only (localStorage key without the "dugu_" prefix, so
 * it is never uploaded) — each device keeps the layout that suits its screen.
 */

export type ClassroomPanel = 'video' | 'whiteboard' | 'questions' | 'learning';
const PANELS: ClassroomPanel[] = ['video', 'whiteboard', 'questions', 'learning'];

export interface ClassroomLayout {
  show: Record<ClassroomPanel, boolean>;
  /** Share of the screen given to the left column (0.2 – 0.85). */
  mainRatio: number;
  /** Share of the left column given to the video (rest goes to the whiteboard). */
  stageRatio: number;
  /** Narrow screens: which of video/whiteboard is in front. */
  stageTab: 'video' | 'whiteboard';
  /** Share of the side column given to Learning (rest goes to Questions). */
  sideRatio: number;
  /** Narrow screens: which side window is in front. */
  sideTab: 'questions' | 'learning';
}

export const DEFAULT_LAYOUT: ClassroomLayout = {
  // The whiteboard starts switched off; turn it on from the header.
  show: { video: true, whiteboard: false, questions: true, learning: true },
  mainRatio: 0.62,
  stageRatio: 0.4,
  stageTab: 'video',
  sideRatio: 0.55,
  sideTab: 'learning',
};

export const MIN_RATIO = 0.2;
export const MAX_RATIO = 0.85;
const LAYOUT_KEY = 'edutrack_classroom_layout';

export function clampRatio(r: number): number {
  if (!Number.isFinite(r)) return 0.5;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));
}

/** Read the saved layout, repairing anything missing or out of range. */
export function loadLayout(): ClassroomLayout {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    return normaliseLayout(raw);
  } catch {
    return normaliseLayout(null);
  }
}

export function saveLayout(layout: ClassroomLayout) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* ignore */ }
}

export function normaliseLayout(raw: any): ClassroomLayout {
  const d = DEFAULT_LAYOUT;
  if (!raw || typeof raw !== 'object') return { ...d, show: { ...d.show } };
  const show = {
    video: raw.show?.video !== false,
    whiteboard: raw.show?.whiteboard === true,
    questions: raw.show?.questions !== false,
    learning: raw.show?.learning !== false,
  };
  // Never end up with an empty screen.
  if (!PANELS.some((p) => show[p])) show.video = true;
  return {
    show,
    mainRatio: clampRatio(typeof raw.mainRatio === 'number' ? raw.mainRatio : d.mainRatio),
    stageRatio: clampRatio(typeof raw.stageRatio === 'number' ? raw.stageRatio : d.stageRatio),
    stageTab: raw.stageTab === 'whiteboard' ? 'whiteboard' : 'video',
    sideRatio: clampRatio(typeof raw.sideRatio === 'number' ? raw.sideRatio : d.sideRatio),
    sideTab: raw.sideTab === 'questions' ? 'questions' : 'learning',
  };
}

/** Switch one window on/off. The last open window can't be switched off. */
export function togglePanel(layout: ClassroomLayout, panel: ClassroomPanel): ClassroomLayout {
  const show = { ...layout.show, [panel]: !layout.show[panel] };
  if (!PANELS.some((p) => show[p])) return layout;
  // On narrow screens, bring a window to the front when it is switched on.
  return show[panel] ? bringToFront({ ...layout, show }, panel) : { ...layout, show };
}

/** Make sure a window is open and in front (e.g. "Open in Learning" from the chat). */
export function revealPanel(layout: ClassroomLayout, panel: ClassroomPanel): ClassroomLayout {
  return bringToFront({ ...layout, show: { ...layout.show, [panel]: true } }, panel);
}

function bringToFront(layout: ClassroomLayout, panel: ClassroomPanel): ClassroomLayout {
  if (panel === 'video' || panel === 'whiteboard') return { ...layout, stageTab: panel };
  return { ...layout, sideTab: panel };
}

/** Wide = side-by-side windows; narrow = stacked with tabs. */
export function isWideScreen(width: number, height: number): boolean {
  return width >= 640 && width >= height;
}
