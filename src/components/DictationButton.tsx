/**
 * DictationButton (v1.5) — speak instead of typing, in ANY text box.
 *
 * Tap into a text box (Daily Log notes, class board, My notes, a task…) and
 * a round 🎤 button appears on the right. Tap it and speak; the words are
 * typed where the cursor is. Tap again to stop. Say "full stop", "comma",
 * "question mark", "new line" or "new paragraph" for punctuation.
 *
 *   variant "floating" — shown on every page (Layout) and in the class room.
 *
 * Hidden on browsers without speech recognition (e.g. Firefox).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import {
  DICTATION_LANGUAGES, getRecognitionClass, insertIntoField, isDictatable, loadDictationLang, saveDictationLang,
} from '../lib/dictation';

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

export default function DictationButton() {
  const Recognition = getRecognitionClass();
  const [field, setField] = useState<Field | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [lang, setLang] = useState(loadDictationLang);
  const [bottom, setBottom] = useState(96);

  const fieldRef = useRef<Field | null>(null);
  const recRef = useRef<any>(null);
  const wantOn = useRef(false); // user wants dictation on (restart after pauses)

  // ---- Remember the text box the user is in ------------------------------------
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element;
      if (isDictatable(el)) { fieldRef.current = el as Field; setField(el as Field); }
    };
    const onFocusOut = () => {
      // Keep the button while dictating; otherwise hide it once nothing is focused.
      setTimeout(() => {
        if (!wantOn.current && !isDictatable(document.activeElement)) setField(null);
      }, 200);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // ---- Stay above the on-screen keyboard (phones/tablets) ---------------------------
  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const place = () => setBottom(Math.max(16, window.innerHeight - (vv.height + vv.offsetTop)) + 80);
    place();
    vv.addEventListener('resize', place);
    vv.addEventListener('scroll', place);
    return () => { vv.removeEventListener('resize', place); vv.removeEventListener('scroll', place); };
  }, []);

  useEffect(() => () => { wantOn.current = false; try { recRef.current?.abort(); } catch { /* ignore */ } }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 7000);
    return () => clearTimeout(t);
  }, [message]);

  if (!Recognition) return null;
  if (!field && !listening) return null;

  const startSession = () => {
    const rec = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    // Android Chrome repeats words in continuous mode — use short sessions there.
    rec.continuous = !IS_ANDROID;
    rec.onresult = (e: any) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const target = fieldRef.current;
          if (target && document.contains(target)) insertIntoField(target, r[0].transcript);
        } else {
          live += r[0].transcript;
        }
      }
      setInterim(live);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantOn.current = false;
        setMessage('Microphone blocked. Allow the microphone for EduTrack in the browser settings, then try again.');
      } else if (e.error === 'network') {
        wantOn.current = false;
        setMessage('Dictation needs an internet connection.');
      } else if (e.error === 'audio-capture') {
        wantOn.current = false;
        setMessage('No microphone available — it may be in use by the video call on this device.');
      }
      // 'no-speech' / 'aborted': just carry on (restarted in onend)
    };
    rec.onend = () => {
      setInterim('');
      if (wantOn.current) {
        try { startSession(); return; } catch { /* fall through */ }
      }
      setListening(false);
    };
    recRef.current = rec;
    rec.start();
  };

  const start = () => {
    if (!fieldRef.current) { setMessage('Tap into a text box first, then press the microphone.'); return; }
    try {
      wantOn.current = true;
      setListening(true);
      setMessage(null);
      startSession();
    } catch (e) {
      console.warn(e);
      wantOn.current = false;
      setListening(false);
      setMessage('Could not start dictation.');
    }
  };

  const stop = () => {
    wantOn.current = false;
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
    setInterim('');
    fieldRef.current?.focus();
  };

  const changeLang = (code: string) => {
    setLang(code);
    saveDictationLang(code);
    if (listening) { stop(); setMessage('Language changed — press the microphone again.'); }
  };

  return (
    <div className="fixed right-3 z-[70] flex flex-col items-end gap-2 print:hidden" style={{ bottom }}>
      {(listening || message) && (
        <div className="max-w-[min(20rem,80vw)] bg-slate-900/95 text-white text-xs rounded-xl shadow-lg p-2.5 space-y-1.5">
          {message ? (
            <div className="flex gap-2"><span className="flex-1">{message}</span>
              <button onClick={() => setMessage(null)} aria-label="Close" className="shrink-0"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-semibold">Listening…</span>
                <select
                  value={lang}
                  onChange={(e) => changeLang(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="ml-auto bg-slate-800 text-white text-[11px] rounded px-1 py-0.5 border border-slate-600"
                  aria-label="Dictation language"
                >
                  {DICTATION_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div className="text-slate-300 italic min-h-[1rem]">{interim || 'Speak now — say “full stop”, “comma”, “new line”.'}</div>
            </>
          )}
        </div>
      )}
      <button
        // keep the cursor in the text box when the button is tapped
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={listening ? stop : start}
        title={listening ? 'Stop dictation' : 'Dictate — speak instead of typing'}
        aria-label={listening ? 'Stop dictation' : 'Start dictation'}
        aria-pressed={listening}
        className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-white transition-colors
          ${listening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
    </div>
  );
}
