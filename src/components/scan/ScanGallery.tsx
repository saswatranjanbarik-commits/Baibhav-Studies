/**
 * ScanGallery (v1.5) — shows scanned pages as thumbnails; tap one to open
 * the full-screen viewer (next/previous, zoom, rotate view, download).
 * PDFs open in a new tab. Audio recordings get a play bar (v1.5).
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCw, Download, FileText, Loader2, ImageOff, Music } from 'lucide-react';
import { ScanPage, loadScanPage, dataUrlToBlob } from '../../lib/scans';

interface Props {
  scanIds: string[];
  /** Smaller thumbnails (class board). */
  compact?: boolean;
  /** Name used for downloads, e.g. the task title. */
  downloadName?: string;
}

export default function ScanGallery({ scanIds, compact, downloadName }: Props) {
  const [pages, setPages] = useState<(ScanPage | null | undefined)[]>(() => scanIds.map(() => undefined));
  const [open, setOpen] = useState<number | null>(null);
  const key = scanIds.join(',');

  useEffect(() => {
    let cancelled = false;
    setPages(scanIds.map(() => undefined));
    scanIds.forEach((id, i) => {
      loadScanPage(id)
        .then((p) => { if (!cancelled) setPages((list) => { const c = [...list]; c[i] = p; return c; }); })
        .catch(() => { if (!cancelled) setPages((list) => { const c = [...list]; c[i] = null; return c; }); });
    });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPdf = (p: ScanPage) => {
    const url = URL.createObjectURL(dataUrlToBlob(p.data));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const size = compact ? 'h-16 w-14' : 'h-28 w-24';
  const audios = pages.map((p, i) => ({ p, i })).filter((x) => x.p && x.p.kind === 'audio') as { p: ScanPage; i: number }[];
  return (
    <>
      {audios.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {audios.map(({ p, i }) => (
            <div key={scanIds[i]} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Music className="h-4 w-4 text-indigo-600 shrink-0" />
              <audio controls preload="metadata" src={p.data} className="flex-1 min-w-0 h-9" />
              <a href={p.data} download={p.name || `audio-${i + 1}.webm`} className="p-1 text-slate-500 hover:text-slate-800" title="Download audio" aria-label="Download audio">
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {pages.map((p, i) => (p && p.kind === 'audio') ? null : (
          <button
            key={scanIds[i]}
            onClick={() => p && (p.kind === 'pdf' ? openPdf(p) : setOpen(i))}
            className={`${size} rounded-md border border-slate-300 bg-slate-100 overflow-hidden flex items-center justify-center relative hover:ring-2 hover:ring-indigo-400`}
            title={p?.kind === 'pdf' ? p.name || 'PDF' : `Page ${i + 1}`}
          >
            {p === undefined && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            {p === null && <ImageOff className="h-4 w-4 text-slate-400" />}
            {p && p.kind === 'image' && <img src={p.data} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />}
            {p && p.kind === 'pdf' && <FileText className="h-6 w-6 text-red-500" />}
            <span className="absolute bottom-0 right-0 text-[9px] font-bold bg-black/60 text-white px-1 rounded-tl">{i + 1}</span>
          </button>
        ))}
      </div>
      {open !== null && (
        <Viewer
          pages={pages}
          start={open}
          downloadName={downloadName || 'scan'}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function Viewer({ pages, start, downloadName, onClose }: {
  pages: (ScanPage | null | undefined)[]; start: number; downloadName: string; onClose: () => void;
}) {
  const images = pages.map((p, i) => ({ p, i })).filter((x) => x.p && x.p.kind === 'image') as { p: ScanPage; i: number }[];
  const [pos, setPos] = useState(Math.max(0, images.findIndex((x) => x.i === start)));
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  const cur = images[pos];

  useEffect(() => { setZoom(1); setTurn(0); }, [pos]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPos((p) => Math.min(images.length - 1, p + 1));
      if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  if (!cur) return null;
  const download = () => {
    const a = document.createElement('a');
    a.href = cur.p.data;
    a.download = `${downloadName.replace(/[^\w\- ]+/g, '').trim() || 'scan'}-page-${cur.i + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 text-white text-sm">
        <span className="font-semibold mr-auto">Page {cur.i + 1} of {pages.length} · by {cur.p.byName}</span>
        <Btn label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}><ZoomOut className="h-5 w-5" /></Btn>
        <Btn label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}><ZoomIn className="h-5 w-5" /></Btn>
        <Btn label="Rotate" onClick={() => setTurn((t) => (t + 90) % 360)}><RotateCw className="h-5 w-5" /></Btn>
        <Btn label="Download" onClick={download}><Download className="h-5 w-5" /></Btn>
        <Btn label="Close" onClick={onClose}><X className="h-5 w-5" /></Btn>
      </div>
      {/* Scrollable when zoomed; pinch-zoom also works on tablets */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-2">
        <img
          src={cur.p.data}
          alt={`Page ${cur.i + 1}`}
          style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : 'none', transform: `rotate(${turn}deg)`, transformOrigin: 'center' }}
          className={`bg-white ${zoom === 1 ? 'max-h-full object-contain' : ''}`}
        />
      </div>
      {images.length > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-6 py-2 text-white">
          <Btn label="Previous page" onClick={() => setPos((p) => Math.max(0, p - 1))}><ChevronLeft className="h-7 w-7" /></Btn>
          <span className="text-sm">{pos + 1} / {images.length}</span>
          <Btn label="Next page" onClick={() => setPos((p) => Math.min(images.length - 1, p + 1))}><ChevronRight className="h-7 w-7" /></Btn>
        </div>
      )}
    </div>
  );
}

function Btn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} title={label} aria-label={label} className="p-1.5 rounded-md hover:bg-white/15">{children}</button>;
}
