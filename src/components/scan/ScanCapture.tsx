/**
 * ScanCapture (v1.5) — scan handwritten work with the camera.
 *
 *  1. "Take photo" opens the camera (tablet/phone) — one photo per page.
 *     "Add from gallery / files" picks existing photos or a small PDF.
 *  2. Each page: rotate, choose "Clean (document)" — white paper, dark ink —
 *     or "Photo" (colours as taken); move pages up/down; remove.
 *  3. "Send" saves the pages (see lib/scans.ts) and returns their ids.
 *
 * Tip shown to the student: lay the page flat, in good light, fill the screen.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, RotateCcw, RotateCw, Trash2, ChevronUp, ChevronDown, X, Loader2, FileText, Wand2 } from 'lucide-react';
import type { AppUser } from '../../lib/AuthContext';
import {
  ScanMode, MAX_PAGES, loadImageFile, renderPage, readPdf, saveScanPage, newScanId,
} from '../../lib/scans';

interface Draft {
  key: string;
  kind: 'image' | 'pdf';
  img?: HTMLImageElement;
  pdfData?: string;
  name?: string;
  rotation: number;
  mode: ScanMode;
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
  onClose: () => void;
  onDone: (scanIds: string[], caption: string) => void | Promise<void>;
}

export default function ScanCapture({ user, title, subtitle, context, withCaption, sendLabel, onClose, onDone }: Props) {
  const [pages, setPages] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Rebuild a page's preview when it is rotated or its mode changes.
  const preview = (d: Omit<Draft, 'preview'>): Draft =>
    ({ ...d, preview: d.kind === 'image' && d.img ? renderPage(d.img, d.rotation, d.mode).data : '' });

  const addFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    setBusy('Preparing pages…');
    const added: Draft[] = [];
    for (const file of Array.from(files)) {
      if (pages.length + added.length >= MAX_PAGES) { setError(`Up to ${MAX_PAGES} pages at a time.`); break; }
      try {
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          added.push({ key: newScanId(), kind: 'pdf', pdfData: await readPdf(file), name: file.name, rotation: 0, mode: 'photo', preview: '' });
        } else {
          const img = await loadImageFile(file);
          added.push(preview({ key: newScanId(), kind: 'image', img, rotation: 0, mode: 'document' }));
        }
      } catch (e: any) {
        setError(e?.message || 'A file could not be added.');
      }
    }
    setPages((p) => [...p, ...added]);
    setBusy(null);
  };

  const update = (key: string, change: Partial<Draft>) =>
    setPages((list) => list.map((d) => (d.key === key ? preview({ ...d, ...change }) : d)));
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
    try {
      for (let i = 0; i < pages.length; i++) {
        setBusy(`Saving page ${i + 1} of ${pages.length}…`);
        const d = pages[i];
        const id = newScanId();
        const at = new Date().toISOString();
        if (d.kind === 'pdf') {
          await saveScanPage({ id, kind: 'pdf', mime: 'application/pdf', data: d.pdfData!, bytes: d.pdfData!.length, name: d.name, by: user.email, byName: user.username || user.email, at, context });
        } else {
          const r = renderPage(d.img!, d.rotation, d.mode);
          await saveScanPage({ id, kind: 'image', mime: 'image/jpeg', data: r.data, width: r.width, height: r.height, bytes: r.data.length, by: user.email, byName: user.username || user.email, at, context });
        }
        ids.push(id);
      }
      setBusy('Finishing…');
      await onDone(ids, caption.trim());
    } catch (e) {
      console.warn(e);
      setError('Could not save the pages. Check the internet connection and try again.');
      setBusy(null);
    }
  };

  // Close with Escape (when not saving).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

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
          <div className="flex flex-wrap gap-2">
            <button onClick={() => cameraInput.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50">
              <Camera className="h-5 w-5" /> {pages.length ? 'Take next page' : 'Take photo'}
            </button>
            <button onClick={() => fileInput.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50">
              <ImagePlus className="h-5 w-5" /> Add from gallery / files
            </button>
            {/* capture="environment" opens the back camera on tablets/phones */}
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {!pages.length && (
            <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
              <strong>Tips:</strong> lay the page flat in good light, hold the tablet straight above it and fill the screen with the page. Take one photo per page.
            </div>
          )}

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pages.map((d, i) => (
              <div key={d.key} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 mr-auto">Page {i + 1}</span>
                  {d.kind === 'image' && (
                    <>
                      <IconBtn label="Rotate left" onClick={() => update(d.key, { rotation: (d.rotation + 270) % 360 })}><RotateCcw className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Rotate right" onClick={() => update(d.key, { rotation: (d.rotation + 90) % 360 })}><RotateCw className="h-4 w-4" /></IconBtn>
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
                  <img src={d.preview} alt={`Page ${i + 1}`} className="w-full max-h-72 object-contain bg-slate-100" />
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
          <span className="text-xs text-slate-500 mr-auto">{busy || `${pages.length} page${pages.length === 1 ? '' : 's'}`}</span>
          <button onClick={onClose} disabled={!!busy} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40">Cancel</button>
          <button onClick={send} disabled={!pages.length || !!busy} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:bg-slate-300">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {sendLabel || 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} title={label} aria-label={label} className="p-1 rounded hover:bg-slate-200 text-slate-600">{children}</button>;
}
