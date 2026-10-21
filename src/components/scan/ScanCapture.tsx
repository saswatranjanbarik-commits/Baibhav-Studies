/**
 * ScanCapture (v1.5) — scan handwritten work with the camera.
 *
 *  1. "Take photo" opens the camera (tablet/phone) — one photo per page.
 *     "Add from gallery / files" picks existing photos or a small PDF.
 *  2. Each page is AUTO-ALIGNED: the app finds the page edges and
 *     straightens it like a scanner. "Adjust corners" lets the student drag
 *     the four corners onto the page corners; "Whole photo" undoes it.
 *     Also: rotate, "Clean" (white paper, dark ink) or "Photo", reorder, remove.
 *  3. Size: Small (saves space) / Standard / Sharp.
 *  4. "Submit"/"Send" saves the pages (lib/scans.ts) and returns their ids.
 *     They can be downloaded later as ONE PDF.
 *  5. Also: PDF files, and audio — record a voice answer (or pick an audio
 *     file). `startWith` opens the chosen option straight away.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Camera, ImagePlus, RotateCcw, RotateCw, Trash2, ChevronUp, ChevronDown, X, Loader2, FileText, Wand2, Crop, Maximize,
  Mic, Music,
} from 'lucide-react';
import AudioRecorder, { canRecordAudio, fmtDuration } from './AudioRecorder';
import type { AppUser } from '../../lib/AuthContext';
import {
  ScanMode, ScanSize, NormQuad, MAX_PAGES, loadImageFile, renderPage, readPdf, saveScanPage, newScanId,
  autoDetectCorners, rotatedCanvas, readFileData,
} from '../../lib/scans';

export type CaptureStart = 'camera' | 'gallery' | 'pdf' | 'audio';

interface Draft {
  key: string;
  kind: 'image' | 'pdf' | 'audio';
  img?: HTMLImageElement;
  pdfData?: string;      // PDF or audio file, as a data URL
  mime?: string;
  durationSec?: number;
  name?: string;
  rotation: number;
  mode: ScanMode;
  corners: NormQuad | null;
  autoAligned?: boolean;
  preview: string;
}

interface Props {
  user: AppUser;
  title: string;
  /** Shown above the pages, e.g. the task name or the class question. */
  subtitle?: string;
  context: { type: 'task' | 'class'; id: string };
  /** Optional caption box (class answers). */
  withCaption?: boolean;
  sendLabel?: string;
  /** Open this option straight away (e.g. the "Audio" button on a task). */
  startWith?: CaptureStart;
  onClose: () => void;
  /** Gets the saved page ids, the note, and the total stored size (bytes). */
  onDone: (scanIds: string[], caption: string, bytes: number) => void | Promise<void>;
}

const SIZE_LABELS: Record<ScanSize, string> = { small: 'Small (saves space)', standard: 'Standard', sharp: 'Sharp' };

export default function ScanCapture({ user, title, subtitle, context, withCaption, sendLabel, startWith, onClose, onDone }: Props) {
  const [pages, setPages] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [size, setSize] = useState<ScanSize>('standard');
  const [cropping, setCropping] = useState<string | null>(null); // key of the page being aligned
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(startWith === 'audio');

  // Open the chosen option once (the tap that opened this screen still counts as a user action).
  useEffect(() => {
    if (startWith === 'camera') cameraInput.current?.click();
    else if (startWith === 'gallery') fileInput.current?.click();
    else if (startWith === 'pdf') pdfInput.current?.click();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview at the small size (fast); the chosen size is used when saving.
  const preview = (d: Omit<Draft, 'preview'>): Draft => ({
    ...d,
    preview: d.kind === 'image' && d.img
      ? renderPage(d.img, { rotation: d.rotation, mode: d.mode, corners: d.corners, size: 'small' }).data
      : '',
  });

  const addFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    setBusy('Preparing pages…');
    const added: Draft[] = [];
    for (const file of Array.from(files)) {
      if (pages.length + added.length >= MAX_PAGES) { setError(`Up to ${MAX_PAGES} pages at a time.`); break; }
      try {
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          added.push({ key: newScanId(), kind: 'pdf', pdfData: await readPdf(file), mime: 'application/pdf', name: file.name, rotation: 0, mode: 'photo', corners: null, preview: '' });
        } else if (file.type.startsWith('audio/')) {
          added.push({ key: newScanId(), kind: 'audio', pdfData: await readFileData(file, file.name), mime: file.type, name: file.name, rotation: 0, mode: 'photo', corners: null, preview: '' });
        } else {
          const img = await loadImageFile(file);
          const corners = autoDetectCorners(img, 0);
          added.push(preview({ key: newScanId(), kind: 'image', img, rotation: 0, mode: 'document', corners, autoAligned: !!corners }));
        }
      } catch (e: any) {
        setError(e?.message || 'A file could not be added.');
      }
    }
    setPages((p) => [...p, ...added]);
    setBusy(null);
  };

  const addRecording = async (a: { blob: Blob; mime: string; durationSec: number }) => {
    try {
      const data = await readFileData(a.blob, 'The recording');
      const ext = a.mime.includes('mp4') ? 'm4a' : a.mime.includes('ogg') ? 'ogg' : 'webm';
      setPages((p) => [...p, {
        key: newScanId(), kind: 'audio', pdfData: data, mime: a.mime, durationSec: a.durationSec,
        name: `recording-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${ext}`,
        rotation: 0, mode: 'photo', corners: null, preview: '',
      }]);
      setRecording(false);
    } catch (e: any) {
      setError(e?.message || 'The recording could not be added.');
    }
  };

  const update = (key: string, change: Partial<Draft>) =>
    setPages((list) => list.map((d) => (d.key === key ? preview({ ...d, ...change }) : d)));
  const rotate = (d: Draft, by: number) => {
    // Corners belong to one rotation; find the page again after turning.
    const rotation = (d.rotation + by + 360) % 360;
    const corners = d.img ? autoDetectCorners(d.img, rotation) : null;
    update(d.key, { rotation, corners, autoAligned: !!corners });
  };
  const move = (i: number, by: number) => setPages((list) => {
    const j = i + by;
    if (j < 0 || j >= list.length) return list;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  const send = async () => {
    if (!pages.length) return;
    setError(null);
    const ids: string[] = [];
    let bytes = 0;
    try {
      for (let i = 0; i < pages.length; i++) {
        setBusy(`Saving ${i + 1} of ${pages.length}…`);
        const d = pages[i];
        const id = newScanId();
        const at = new Date().toISOString();
        const by = { by: user.email, byName: user.username || user.email, at, context };
        if (d.kind === 'pdf' || d.kind === 'audio') {
          await saveScanPage({ id, kind: d.kind, mime: d.mime || (d.kind === 'pdf' ? 'application/pdf' : 'audio/webm'), data: d.pdfData!, bytes: d.pdfData!.length, name: d.name, durationSec: d.durationSec, ...by });
          bytes += d.pdfData!.length;
        } else {
          const r = renderPage(d.img!, { rotation: d.rotation, mode: d.mode, corners: d.corners, size });
          await saveScanPage({ id, kind: 'image', mime: 'image/jpeg', data: r.data, width: r.width, height: r.height, bytes: r.data.length, ...by });
          bytes += r.data.length;
        }
        ids.push(id);
      }
      setBusy('Finishing…');
      await onDone(ids, caption.trim(), bytes);
    } catch (e) {
      console.warn(e);
      setError('Could not save. Check the internet connection and try again — nothing was lost on this screen.');
      setBusy(null);
    }
  };

  // Close with Escape (when not saving / aligning).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy && !cropping) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, cropping, onClose]);

  const croppingPage = pages.find((d) => d.key === cropping);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <Camera className="h-5 w-5 text-indigo-600" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} disabled={!!busy} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-40" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => cameraInput.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50">
              <Camera className="h-5 w-5" /> {pages.length ? 'Take next page' : 'Take photo'}
            </button>
            <button onClick={() => fileInput.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg px-3 py-2.5 disabled:opacity-50">
              <ImagePlus className="h-5 w-5" /> Gallery
            </button>
            <button onClick={() => pdfInput.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg px-3 py-2.5 disabled:opacity-50">
              <FileText className="h-5 w-5" /> PDF
            </button>
            {canRecordAudio() && (
              <button onClick={() => setRecording(true)} disabled={!!busy || recording} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg px-3 py-2.5 disabled:opacity-50">
                <Mic className="h-5 w-5" /> Record audio
              </button>
            )}
            <label className="ml-auto text-xs text-slate-600 flex items-center gap-1.5">
              Size
              <select value={size} onChange={(e) => setSize(e.target.value as ScanSize)} className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white">
                {(Object.keys(SIZE_LABELS) as ScanSize[]).map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
              </select>
            </label>
            {/* capture="environment" opens the back camera on tablets/phones */}
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={fileInput} type="file" accept="image/*,audio/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={pdfInput} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {recording && <AudioRecorder onAdd={addRecording} onCancel={() => setRecording(false)} />}

          {!pages.length && !recording && (
            <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
              <strong>Tips:</strong> lay the page flat on a darker table in good light and hold the tablet straight above it. The app finds the page edges and straightens it — you can adjust the corners. Take one photo per page.
            </div>
          )}

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pages.map((d, i) => (
              <div key={d.key} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 mr-auto">{d.kind === 'audio' ? 'Audio' : d.kind === 'pdf' ? 'PDF' : 'Page'} {i + 1}</span>
                  {d.kind === 'image' && (
                    <>
                      <button onClick={() => setCropping(d.key)} className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-50" title="Drag the corners onto the page corners">
                        <Crop className="h-3.5 w-3.5" /> Adjust corners
                      </button>
                      <IconBtn label="Rotate left" onClick={() => rotate(d, -90)}><RotateCcw className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Rotate right" onClick={() => rotate(d, 90)}><RotateCw className="h-4 w-4" /></IconBtn>
                      <button
                        onClick={() => update(d.key, { mode: d.mode === 'document' ? 'photo' : 'document' })}
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold ${d.mode === 'document' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                        title="Clean = white paper, dark writing (like a scanner)"
                      >
                        <Wand2 className="h-3.5 w-3.5" /> {d.mode === 'document' ? 'Clean' : 'Photo'}
                      </button>
                    </>
                  )}
                  <IconBtn label="Move up" onClick={() => move(i, -1)}><ChevronUp className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)}><ChevronDown className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Remove page" onClick={() => setPages((list) => list.filter((x) => x.key !== d.key))}><Trash2 className="h-4 w-4 text-red-500" /></IconBtn>
                </div>
                {d.kind === 'image' ? (
                  <>
                    <img src={d.preview} alt={`Page ${i + 1}`} className="w-full max-h-72 object-contain bg-slate-100" />
                    <div className="px-2 py-1 text-[11px] text-slate-500 border-t border-slate-100">
                      {d.corners ? (d.autoAligned ? 'Page edges found and straightened automatically.' : 'Straightened to your corners.') : 'Whole photo (not straightened).'}
                    </div>
                  </>
                ) : d.kind === 'audio' ? (
                  <div className="p-3 bg-slate-100 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Music className="h-4 w-4 text-indigo-600" /> {d.durationSec ? `Recording · ${fmtDuration(d.durationSec)}` : d.name}</div>
                    <audio controls src={d.pdfData} className="w-full" />
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-600 bg-slate-100">
                    <FileText className="h-8 w-8 text-red-500 mb-1" />
                    <span className="text-xs font-semibold px-2 text-center break-all">{d.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {withCaption && (
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Add a note (optional)…"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3">
          <span className="text-xs text-slate-500 mr-auto">{busy || `${pages.length} item${pages.length === 1 ? '' : 's'}`}</span>
          <button onClick={onClose} disabled={!!busy} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40">Cancel</button>
          <button onClick={send} disabled={!pages.length || !!busy} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:bg-slate-300">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {sendLabel || 'Send'}
          </button>
        </div>
      </div>

      {croppingPage && croppingPage.img && (
        <CornerEditor
          img={croppingPage.img}
          rotation={croppingPage.rotation}
          initial={croppingPage.corners}
          onCancel={() => setCropping(null)}
          onApply={(corners) => { update(croppingPage.key, { corners, autoAligned: false }); setCropping(null); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corner editor — drag 4 handles onto the page corners
// ---------------------------------------------------------------------------

const DEFAULT_QUAD: NormQuad = [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96], [0.04, 0.96]];

function CornerEditor({ img, rotation, initial, onCancel, onApply }: {
  img: HTMLImageElement; rotation: number; initial: NormQuad | null;
  onCancel: () => void; onApply: (q: NormQuad | null) => void;
}) {
  const [src] = useState(() => rotatedCanvas(img, rotation, 1200).toDataURL('image/jpeg', 0.85));
  const [quad, setQuad] = useState<NormQuad>(initial || DEFAULT_QUAD);
  const [drag, setDrag] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const toNorm = (e: React.PointerEvent): [number, number] => {
    const r = box.current!.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ];
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag === null) return;
    const p = toNorm(e);
    setQuad((q) => q.map((c, i) => (i === drag ? p : c)) as NormQuad);
  };
  const points = quad.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');

  return (
    <div className="fixed inset-0 z-[65] bg-black/90 flex flex-col">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 text-white text-sm">
        <span className="font-semibold mr-auto">Drag the 4 dots onto the corners of the page</span>
        <button onClick={() => { const a = autoDetectCorners(img, rotation); setQuad(a || DEFAULT_QUAD); }} className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded px-2 py-1">
          <Wand2 className="h-4 w-4" /> Auto-detect
        </button>
        <button onClick={() => onApply(null)} className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded px-2 py-1">
          <Maximize className="h-4 w-4" /> Whole photo
        </button>
        <button onClick={onCancel} className="bg-white/15 hover:bg-white/25 rounded px-2 py-1">Cancel</button>
        <button onClick={() => onApply(quad)} className="bg-emerald-600 hover:bg-emerald-700 rounded px-3 py-1 font-semibold">Apply</button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div
          ref={box}
          className="relative inline-block select-none"
          style={{ touchAction: 'none' }}
          onPointerMove={onMove}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
        >
          <img src={src} alt="Page to align" className="block max-w-[92vw] max-h-[78vh]" draggable={false} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
            <polygon points={points} fill="rgba(79,70,229,0.18)" stroke="#818cf8" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          </svg>
          {quad.map(([x, y], i) => (
            <span
              key={i}
              role="slider"
              aria-label={['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left'][i] + ' corner'}
              onPointerDown={(e) => { e.preventDefault(); (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId); setDrag(i); }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full border-2 border-white shadow-lg ${drag === i ? 'bg-indigo-400' : 'bg-indigo-600/80'}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, cursor: 'grab', touchAction: 'none' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} title={label} aria-label={label} className="p-1 rounded hover:bg-slate-200 text-slate-600">{children}</button>;
}
