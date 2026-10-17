/**
 * Dictation (v1.5) — speech to text helpers.
 *
 * Uses the browser's built-in speech recognition (Chrome, Edge, Android
 * Chrome, Safari). Free, nothing to install; Chrome sends the audio to
 * Google's speech service to turn it into text, so it needs internet.
 * Firefox doesn't support it (the mic button is then hidden).
 */

export interface DictationLanguage { code: string; label: string }

export const DICTATION_LANGUAGES: DictationLanguage[] = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'hi-IN', label: 'Hindi' },
];

/** Device-only setting (no "dugu_" prefix → never uploaded). */
const LANG_KEY = 'edutrack_dictation_lang';

export function loadDictationLang(): string {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && DICTATION_LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch { /* ignore */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return DICTATION_LANGUAGES.find((l) => l.code === nav)?.code || 'en-IN';
}

export function saveDictationLang(code: string) {
  try { localStorage.setItem(LANG_KEY, code); } catch { /* ignore */ }
}

/** The browser's speech recognition class, or null if not supported. */
export function getRecognitionClass(): any | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Spoken punctuation → symbols (English). Longest phrases first.
 * ("period" and "colon" are left as words — they are study terms too.)
 */
const SPOKEN: [RegExp, string][] = [
  [/\s*\bnew paragraph\b\s*/gi, '\n\n'],
  [/\s*\b(new|next) line\b\s*/gi, '\n'],
  [/\s*\bfull stop\b/gi, '.'],
  [/\s*\bquestion mark\b/gi, '?'],
  [/\s*\bexclamation (mark|point)\b/gi, '!'],
  [/\s*\bcomma\b/gi, ','],
  [/\s*\bopen bracket\b\s*/gi, ' ('],
  [/\s*\bclose bracket\b/gi, ')'],
];

/**
 * Tidy one recognised phrase for inserting after `before` (the text just
 * before the cursor): spoken punctuation, a space where needed, and a
 * capital letter at the start of a sentence.
 */
export function formatDictated(spoken: string, before: string): string {
  let text = spoken.trim();
  if (!text) return '';
  for (const [re, sym] of SPOKEN) text = text.replace(re, sym);
  // a space after punctuation that is followed by a word
  text = text.replace(/([.,?!:;])(?=[A-Za-z0-9])/g, '$1 ');
  // capital after a sentence end inside the phrase
  text = text.replace(/([.?!]\s+|\n)([a-z])/g, (_, p, c) => p + c.toUpperCase());

  const prev = before.replace(/[ \t]+$/, '');
  const sentenceStart = prev === '' || /[.?!]\s*$/.test(prev) || /\n$/.test(before);
  if (sentenceStart) text = text.replace(/^([a-z])/, (c) => c.toUpperCase());

  const startsWithPunct = /^[.,?!:;)]/.test(text) || text.startsWith('\n');
  const needsSpace = before !== '' && !/\s$/.test(before) && !startsWithPunct;
  return (needsSpace ? ' ' : '') + text;
}

/** Text boxes dictation can type into. */
export function isDictatable(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    return !el.readOnly && !el.disabled && ['text', 'search', ''].includes((el.getAttribute('type') || '').toLowerCase());
  }
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Insert text at the cursor of an input/textarea in a way React notices
 * (uses the native value setter + an "input" event, so onChange runs).
 */
export function insertIntoField(el: HTMLInputElement | HTMLTextAreaElement | HTMLElement, spoken: string) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const value = el.value;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    let piece = formatDictated(spoken, value.slice(0, start));
    if (el instanceof HTMLInputElement) piece = piece.replace(/\n+/g, ' ');
    if (el.maxLength > 0) piece = piece.slice(0, Math.max(0, el.maxLength - (value.length - (end - start))));
    const next = value.slice(0, start) + piece + value.slice(end);
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const caret = start + piece.length;
    try { el.setSelectionRange(caret, caret); } catch { /* some inputs don't support it */ }
  } else {
    el.focus();
    document.execCommand('insertText', false, formatDictated(spoken, ''));
  }
}
