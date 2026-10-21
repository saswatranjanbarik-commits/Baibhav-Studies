/**
 * AudioRecorder (v1.5) — record a voice answer / instruction in the browser.
 *
 * Uses the browser's built-in recorder (MediaRecorder): no app to install.
 * Recorded at a low "speech" bit rate (≈ 32 kbit/s), so 1 minute ≈ 250 KB.
 * Up to 10 minutes. Press Stop, listen back, then "Add" or "Record again".
 */
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, Check, X } from 'lucide-react';
import { MAX_AUDIO_SECONDS } from '../../lib/scans';

export interface RecordedAudio { blob: Blob; mime: string; durationSec: number }

interface Props {
  onAdd: (audio: RecordedAudio) => void;
  onCancel: () => void;
}

/** A format this browser can record (Chrome/Android: WebM-Opus; Safari/iPad: MP4-AAC). */
function pickMime(): string {
  const MR = (window as any).MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== 'function') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MR.isTypeSupported(t)) || '';
}

export function canRecordAudio(): boolean {
  return typeof window !== 'undefined' && !!(window as any).MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
}

export const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export default function AudioRecorder({ onAdd, onCancel }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordedAudio | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const recorder = useRef<any>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stopTracks = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };

  useEffect(() => () => {
    clearInterval(timer.current);
    try { if (recorder.current?.state === 'recording') recorder.current.stop(); } catch { /* ignore */ }
    stopTracks();
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const start = async () => {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError('Microphone blocked or busy. Allow the microphone for EduTrack (and close the video class on this device if it is open).');
      return;
    }
    const mime = pickMime();
    const MR = (window as any).MediaRecorder;
    const rec = new MR(stream.current, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
    chunks.current = [];
    rec.ondataavailable = (e: any) => { if (e.data && e.data.size) chunks.current.push(e.data); };
    rec.onstop = () => {
      clearInterval(timer.current);
      stopTracks();
      const type = rec.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunks.current, { type });
      const durationSec = Math.round((Date.now() - started.current) / 1000);
      setResult({ blob, mime: type, durationSec });
      setUrl(URL.createObjectURL(blob));
      setState('done');
    };
    recorder.current = rec;
    rec.start(1000);
    started.current = Date.now();
    setSeconds(0);
    setState('recording');
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - started.current) / 1000);
      setSeconds(s);
      if (s >= MAX_AUDIO_SECONDS) { try { rec.stop(); } catch { /* ignore */ } }
    }, 250);
  };

  const stop = () => { try { recorder.current?.stop(); } catch { /* ignore */ } };
  const again = () => { setResult(null); if (url) URL.revokeObjectURL(url); setUrl(null); setState('idle'); setSeconds(0); };

  return (
    <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Mic className="h-4 w-4 text-indigo-600" /> Record audio
        <button onClick={onCancel} className="ml-auto p-1 text-slate-400 hover:text-slate-600" aria-label="Close recorder"><X className="h-4 w-4" /></button>
      </div>
      {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

      {state === 'idle' && (
        <button onClick={start} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-4 py-2">
          <span className="h-3 w-3 rounded-full bg-white" /> Start recording
        </button>
      )}
      {state === 'recording' && (
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
          <span className="font-mono text-lg tabular-nums">{fmtDuration(seconds)}</span>
          <span className="text-xs text-slate-500">max {fmtDuration(MAX_AUDIO_SECONDS)}</span>
          <button onClick={stop} className="ml-auto inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-full px-4 py-2">
            <Square className="h-4 w-4" /> Stop
          </button>
        </div>
      )}
      {state === 'done' && result && url && (
        <div className="space-y-2">
          <audio controls src={url} className="w-full" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-auto">{fmtDuration(result.durationSec)} · {Math.max(1, Math.round(result.blob.size / 1024))} KB</span>
            <button onClick={again} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg px-3 py-1.5"><RotateCcw className="h-4 w-4" /> Record again</button>
            <button onClick={() => onAdd(result)} className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5"><Check className="h-4 w-4" /> Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
