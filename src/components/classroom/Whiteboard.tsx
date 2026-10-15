/**
 * Whiteboard (v1.5) — a live, shared whiteboard inside the class room.
 *
 *  Tools: pen, highlighter, line, rectangle, circle/oval, text, eraser
 *  (erases whole strokes), 6 colours, 3 sizes, undo (your own last stroke),
 *  grid on/off, download the page as a picture, several pages.
 *  Tutor/Admin can also clear a page.
 *
 *  Works with mouse, finger and stylus. Everything drawn appears on the
 *  other person's screen within about a second; each finished stroke is
 *  saved as it is drawn. Pages are shared — everyone sees the same page.
 *
 *  Two canvases: the bottom one shows saved strokes, the top one only the
 *  stroke being drawn right now (fast on tablets).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pencil, Highlighter, Minus, Square, Circle, Type, Eraser, Undo2, Trash2, Download,
  ChevronLeft, ChevronRight, Plus, Hash,
} from 'lucide-react';
import type { AppUser } from '../../lib/AuthContext';
import { newMessageId } from '../../lib/classChat';
import {
  BOARD_W, BOARD_H, WbStroke, WbTool, WB_COLORS, WB_SIZES, MAX_POINTS_PER_STROKE, PAGE_FULL_BYTES,
  MIN_POINT_DISTANCE, encodePoints, decodePoints, clampToBoard, fitBoard, strokeHit, estimatePageBytes,
  orderedStrokes, drawStroke, listenToPage, addStroke, deleteStrokes, clearPage,
} from '../../lib/whiteboard';

type Tool = WbTool | 'eraser';
type Size = keyof typeof WB_SIZES;

interface Props {
  classId: string;
  user: AppUser;
  isHost: boolean;
  page: number;
  pageCount: number;
  onChangePage: (page: number) => void;
  onAddPage: () => void;
}

const TOOLS: { id: Tool; label: string; Icon: typeof Pencil }[] = [
  { id: 'pen', label: 'Pen', Icon: Pencil },
  { id: 'highlighter', label: 'Highlighter', Icon: Highlighter },
  { id: 'line', label: 'Line', Icon: Minus },
  { id: 'rect', label: 'Rectangle', Icon: Square },
  { id: 'ellipse', label: 'Circle / oval', Icon: Circle },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'eraser', label: 'Eraser (removes whole strokes)', Icon: Eraser },
];
const ERASER_RADIUS = 14;

interface TextDraft { x: number; y: number; value: string; created: number }

export default function Whiteboard({ classId, user, isHost, page, pageCount, onChangePage, onAddPage }: Props) {
  const [strokes, setStrokes] = useState<Record<string, WbStroke>>({});
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(WB_COLORS[0]);
  const [size, setSize] = useState<Size>('M');
  const [grid, setGrid] = useState(true);
  const [erasing, setErasing] = useState<Set<string>>(new Set());
  const [textDraft, setTextDraftState] = useState<TextDraft | null>(null);
  // Mirror of textDraft that event handlers can trust (avoids saving text twice).
  const draftRef = useRef<TextDraft | null>(null);
  const setTextDraft = (d: TextDraft | null) => { draftRef.current = d; setTextDraftState(d); };
  const [confirmClear, setConfirmClear] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<{ tool: WbTool; color: string; width: number; pts: number[] } | null>(null);
  const eraseSet = useRef<Set<string>>(new Set());
  const myStrokes = useRef<string[]>([]); // ids drawn by me on this page (for undo)
  const raf = useRef(0);

  // ---- Live data for the current page ---------------------------------------
  useEffect(() => {
    setStrokes({});
    setError(null);
    myStrokes.current = [];
    return listenToPage(classId, page, (s) => { setStrokes(s); setError(null); }, setError);
  }, [classId, page]);

  const decoded = useMemo(() => {
    const m = new Map<string, number[]>();
    Object.values(strokes).forEach((s) => m.set(s.id, decodePoints(s.pts)));
    return m;
  }, [strokes]);
  const full = estimatePageBytes(strokes) > PAGE_FULL_BYTES;

  // ---- Size the canvases to the window ----------------------------------------
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const view = fitBoard(box.w, box.h);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const prepare = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return null;
    const w = Math.max(1, Math.round(box.w * dpr));
    const h = Math.max(1, Math.round(box.h * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
    return ctx;
  };

  // ---- Draw the saved strokes -----------------------------------------------
  useEffect(() => {
    const ctx = prepare(baseRef.current);
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    if (grid) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 50; x < BOARD_W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, BOARD_H); }
      for (let y = 50; y < BOARD_H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(BOARD_W, y); }
      ctx.stroke();
    }
    for (const s of orderedStrokes(strokes)) {
      if (!erasing.has(s.id)) drawStroke(ctx, s, decoded.get(s.id) || []);
    }
  }, [strokes, decoded, erasing, grid, box.w, box.h, dpr]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawLive = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const ctx = prepare(liveRef.current);
      const c = current.current;
      if (!ctx || !c) return;
      drawStroke(ctx, { id: 'live', tool: c.tool, color: c.color, width: c.width, pts: '', by: '', byName: '', at: '' }, c.pts);
    });
  };
  const clearLive = () => { cancelAnimationFrame(raf.current); prepare(liveRef.current); };

  // ---- Pointer → board coordinates --------------------------------------------
  const toBoard = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = liveRef.current!.getBoundingClientRect();
    return clampToBoard((e.clientX - rect.left - view.ox) / view.scale, (e.clientY - rect.top - view.oy) / view.scale);
  };

  const save = (s: Omit<WbStroke, 'id' | 'by' | 'byName' | 'at'>) => {
    const stroke: WbStroke = { ...s, id: newMessageId(), by: user.email, byName: user.username || user.email, at: new Date().toISOString() };
    myStrokes.current.push(stroke.id);
    addStroke(classId, page, stroke).catch((e) => { console.warn(e); setError('A stroke could not be saved. Check the connection.'); });
  };

  const commitCurrent = () => {
    const c = current.current;
    current.current = null;
    clearLive();
    if (!c || c.pts.length < 2) return;
    if (c.tool === 'line' || c.tool === 'rect' || c.tool === 'ellipse') {
      if (c.pts.length < 4 || Math.hypot(c.pts[2] - c.pts[0], c.pts[3] - c.pts[1]) < 4) return; // just a tap
    }
    save({ tool: c.tool, color: c.color, width: c.width, pts: encodePoints(c.pts) });
  };

  const eraseAt = (x: number, y: number) => {
    let changed = false;
    for (const s of Object.values(strokes)) {
      if (!eraseSet.current.has(s.id) && strokeHit(s, decoded.get(s.id) || [], x, y, ERASER_RADIUS)) {
        eraseSet.current.add(s.id);
        changed = true;
      }
    }
    if (changed) setErasing(new Set(eraseSet.current));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== undefined && e.button > 0) return; // left button / touch / pen only
    if (full && tool !== 'eraser') return;
    const [x, y] = toBoard(e);
    if (tool === 'text') {
      // A click while typing places the text; the next click starts a new one.
      if (draftRef.current) { e.preventDefault(); commitText(); return; }
      e.preventDefault(); // keep focus for the new text box
      setTextDraft({ x, y, value: '', created: Date.now() });
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'eraser') {
      eraseSet.current = new Set();
      current.current = { tool: 'pen', color: '', width: 0, pts: [] }; // marks "dragging"
      eraseAt(x, y);
      return;
    }
    current.current = { tool, color, width: WB_SIZES[size].line, pts: [x, y] };
    drawLive();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = current.current;
    if (!c) return;
    // Use every sampled point (smoother lines with a stylus) where supported.
    const native = e.nativeEvent as PointerEvent;
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const samples = events.length ? events : [native];
    for (const ev of samples) {
      const [x, y] = toBoard(ev);
      if (tool === 'eraser') { eraseAt(x, y); continue; }
      if (c.tool === 'line' || c.tool === 'rect' || c.tool === 'ellipse') {
        c.pts = [c.pts[0], c.pts[1], x, y];
      } else {
        const n = c.pts.length;
        if (Math.hypot(x - c.pts[n - 2], y - c.pts[n - 1]) >= MIN_POINT_DISTANCE) c.pts.push(x, y);
        if (c.pts.length / 2 >= MAX_POINTS_PER_STROKE) {
          // very long stroke: save this part and carry on seamlessly
          const tail = c.pts.slice(-2);
          commitCurrent();
          current.current = { ...c, pts: tail };
        }
      }
    }
    if (tool !== 'eraser') drawLive();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (tool === 'eraser') {
      current.current = null;
      const ids = Array.from(eraseSet.current);
      eraseSet.current = new Set();
      if (ids.length) {
        myStrokes.current = myStrokes.current.filter((id) => !ids.includes(id));
        deleteStrokes(classId, page, ids)
          .catch((err) => { console.warn(err); setError('Could not erase. Check the connection.'); })
          .finally(() => setErasing(new Set()));
      }
      return;
    }
    commitCurrent();
  };

  const commitText = () => {
    const d = draftRef.current;
    setTextDraft(null);
    if (!d || !d.value.trim()) return;
    save({ tool: 'text', color, width: WB_SIZES[size].text, pts: encodePoints([d.x, d.y]), text: d.value.trimEnd() });
  };

  const undo = () => {
    while (myStrokes.current.length) {
      const id = myStrokes.current.pop()!;
      if (strokes[id]) {
        deleteStrokes(classId, page, [id]).catch((e) => { console.warn(e); setError('Could not undo. Check the connection.'); });
        return;
      }
    }
  };

  const download = () => {
    const c = document.createElement('canvas');
    c.width = BOARD_W;
    c.height = BOARD_H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    for (const s of orderedStrokes(strokes)) drawStroke(ctx, s, decoded.get(s.id) || []);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-page-${page}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
  };

  const cursor = tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair';
  const count = Object.keys(strokes).length;

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 bg-white border-b border-slate-200 overflow-x-auto">
        {TOOLS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { if (draftRef.current) commitText(); setTool(id); }}
            title={label} aria-label={label} aria-pressed={tool === id}
            className={`p-1.5 rounded-md shrink-0 ${tool === id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
        {WB_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title="Colour" aria-label={`Colour ${c}`} aria-pressed={color === c}
            className={`h-5 w-5 rounded-full shrink-0 border-2 ${color === c ? 'border-slate-900 scale-110' : 'border-white'}`}
            style={{ background: c, boxShadow: '0 0 0 1px #cbd5e1' }}
          />
        ))}
        <span className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
        {(Object.keys(WB_SIZES) as Size[]).map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            title={`Size ${s}`} aria-pressed={size === s}
            className={`text-[11px] font-bold w-6 h-6 rounded shrink-0 ${size === s ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {s}
          </button>
        ))}
        <span className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
        <ToolbarBtn onClick={undo} label="Undo my last stroke"><Undo2 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => setGrid((g) => !g)} label={grid ? 'Hide grid' : 'Show grid'} active={grid}><Hash className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={download} label="Download this page as a picture"><Download className="h-4 w-4" /></ToolbarBtn>
        {isHost && (confirmClear ? (
          <span className="flex items-center gap-1 shrink-0">
            <button onClick={() => { setConfirmClear(false); clearPage(classId, page).catch(() => setError('Could not clear the page.')); myStrokes.current = []; }} className="text-[11px] font-semibold text-white bg-red-600 rounded px-2 py-1">Clear page</button>
            <button onClick={() => setConfirmClear(false)} className="text-[11px] font-semibold text-slate-600 px-1">Keep</button>
          </span>
        ) : (
          <ToolbarBtn onClick={() => setConfirmClear(true)} label="Clear this page (everyone)"><Trash2 className="h-4 w-4" /></ToolbarBtn>
        ))}

        {/* Pages */}
        <span className="ml-auto flex items-center gap-0.5 shrink-0 pl-2">
          <ToolbarBtn onClick={() => onChangePage(page - 1)} label="Previous page" disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></ToolbarBtn>
          <span className="text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">{page}/{pageCount}</span>
          <ToolbarBtn onClick={() => onChangePage(page + 1)} label="Next page" disabled={page >= pageCount}><ChevronRight className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn onClick={onAddPage} label="New page (everyone moves to it)"><Plus className="h-4 w-4" /></ToolbarBtn>
        </span>
      </div>

      {(error || full) && (
        <div className="shrink-0 text-[11px] px-2 py-1 bg-amber-50 text-amber-800 border-b border-amber-200">
          {error || 'This page is full — press + for a new page (you can still erase).'}
        </div>
      )}

      {/* Board */}
      <div ref={wrapRef} className="relative flex-1 min-h-0 overflow-hidden">
        <canvas ref={baseRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
        <canvas
          ref={liveRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor }}
          role="img"
          aria-label={`Shared whiteboard, page ${page} of ${pageCount}, ${count} drawings`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {textDraft && (
          <textarea
            autoFocus
            value={textDraft.value}
            onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
            onBlur={(e) => {
              // Some browsers move focus away right after the tap that opened the box.
              const d = draftRef.current;
              if (d && Date.now() - d.created < 300) { const el = e.currentTarget; setTimeout(() => el.focus(), 0); return; }
              commitText();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setTextDraft(null); e.preventDefault(); }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
            }}
            placeholder="Type, Enter to place"
            rows={1}
            className="absolute bg-white/90 border border-indigo-400 rounded px-1 outline-none resize"
            style={{
              left: view.ox + textDraft.x * view.scale,
              top: view.oy + textDraft.y * view.scale,
              color,
              fontSize: Math.max(12, WB_SIZES[size].text * view.scale),
              lineHeight: 1.2,
              minWidth: 160,
            }}
          />
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, label, children, disabled, active }: {
  onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={`p-1.5 rounded-md shrink-0 disabled:opacity-30 ${active ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
}
