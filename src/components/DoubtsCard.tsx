/**
 * DoubtsCard (v1.5) — the "Doubts" section of the Daily Plan & Log page.
 *
 *  Student: "Ask a doubt" — subject (chapter/topic optional) + the question
 *           (the 🎤 dictation button works here too). Sees the tutor's answer.
 *  Tutor/Admin: sees open doubts first, writes an answer, "Mark resolved".
 *  Open doubts also show as an alert on the Dashboard.
 */
import React, { useMemo, useState } from 'react';
import { Plus, X, CheckCircle2, Trash2, RotateCcw } from 'lucide-react';
import type { AppUser } from '../lib/AuthContext';
import { Doubt, addDoubt, newDoubt, updateDoubt, deleteDoubt, doubtPlace } from '../lib/doubts';

interface Props {
  doubts: Doubt[];
  syllabus: any[];
  user: AppUser;
  /** Day shown on the page — used as the doubt's date. */
  date: string;
}

export default function DoubtsCard({ doubts, syllabus, user, date }: Props) {
  const isHost = user.role === 'Teacher' || user.role === 'Admin';
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState<{ subjectId: string; chapterId: string; topicId: string; text: string }>({ subjectId: '', chapterId: '', topicId: '', text: '' });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);

  const subject = syllabus.find((s) => s.id === draft.subjectId);
  const chapter = subject?.chapters?.find((c: any) => c.id === draft.chapterId);
  const topic = chapter?.topics?.find((t: any) => t.id === draft.topicId);

  const open = useMemo(() => doubts.filter((d) => d.status === 'Open').sort((a, b) => a.askedAt.localeCompare(b.askedAt)), [doubts]);
  const resolved = useMemo(() => doubts.filter((d) => d.status === 'Resolved').sort((a, b) => (b.resolvedAt || '').localeCompare(a.resolvedAt || '')), [doubts]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.subjectId || !draft.text.trim()) return;
    addDoubt(newDoubt({
      subjectId: draft.subjectId, subjectName: subject?.name || '',
      chapterId: draft.chapterId || undefined, chapterName: chapter?.name,
      topicId: draft.topicId || undefined, topicName: topic?.name,
      text: draft.text.trim(),
      date,
      askedBy: user.username || user.email,
      askedByEmail: user.email,
    }));
    setDraft({ subjectId: draft.subjectId, chapterId: '', topicId: '', text: '' });
    setAsking(false);
  };

  const resolve = (d: Doubt) => {
    const answer = (answers[d.id] ?? d.answer ?? '').trim();
    updateDoubt(d.id, { status: 'Resolved', answer: answer || undefined, resolvedBy: user.username || user.email, resolvedAt: new Date().toISOString() });
    setAnswers((a) => { const c = { ...a }; delete c[d.id]; return c; });
  };
  const saveAnswer = (d: Doubt) => {
    const answer = (answers[d.id] ?? '').trim();
    if (!answer) return;
    updateDoubt(d.id, { answer });
    setAnswers((a) => { const c = { ...a }; delete c[d.id]; return c; });
  };

  return (
    <div id="doubts" className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-amber-50/70 flex flex-wrap items-center gap-3">
        <HelpCircleIcon />
        <div className="mr-auto">
          <h3 className="font-bold text-slate-900">Doubts</h3>
          <p className="text-xs text-slate-500">
            {open.length ? `${open.length} open doubt${open.length === 1 ? '' : 's'}${isHost ? ' — answer and mark resolved' : ' — your tutor will see them'}` : 'No open doubts.'}
          </p>
        </div>
        {!asking && (
          <button onClick={() => setAsking(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-3 py-1.5">
            <Plus className="h-4 w-4" /> {isHost ? 'Add a doubt' : 'Ask a doubt'}
          </button>
        )}
      </div>

      {asking && (
        <form onSubmit={submit} className="p-4 border-b border-slate-100 bg-slate-50 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select required value={draft.subjectId} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value, chapterId: '', topicId: '' })} className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white">
              <option value="">Subject…</option>
              {syllabus.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select disabled={!subject} value={draft.chapterId} onChange={(e) => setDraft({ ...draft, chapterId: e.target.value, topicId: '' })} className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white disabled:bg-slate-100">
              <option value="">Chapter (optional)</option>
              {subject?.chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select disabled={!chapter} value={draft.topicId} onChange={(e) => setDraft({ ...draft, topicId: e.target.value })} className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white disabled:bg-slate-100">
              <option value="">Topic (optional)</option>
              {chapter?.topics?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <textarea
            required
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            rows={3}
            maxLength={2000}
            placeholder="What is your doubt? (You can use the 🎤 button to speak it.)"
            className="w-full text-sm border border-slate-300 rounded-md px-2 py-1.5"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAsking(false)} className="text-sm font-semibold text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-200 inline-flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
            <button type="submit" className="text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md px-3 py-1.5">Save doubt</button>
          </div>
        </form>
      )}

      {open.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {open.map((d) => (
            <li key={d.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">{doubtPlace(d)}</div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">{d.text}</div>
                  <div className="text-[11px] text-slate-400">{d.askedBy} · {new Date(d.askedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  {d.answer && <div className="mt-1 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 whitespace-pre-wrap"><strong>Answer:</strong> {d.answer}</div>}
                </div>
                {(isHost || d.askedByEmail === user.email) && (
                  <button onClick={() => { if (window.confirm('Delete this doubt?')) deleteDoubt(d.id); }} className="p-1 text-slate-400 hover:text-red-600" aria-label="Delete doubt" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isHost ? (
                <div className="pl-4 space-y-1.5">
                  <textarea
                    value={answers[d.id] ?? d.answer ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [d.id]: e.target.value }))}
                    rows={2}
                    placeholder="Write an answer (optional)…"
                    className="w-full text-sm border border-slate-300 rounded-md px-2 py-1.5"
                  />
                  <div className="flex gap-2 justify-end">
                    {(answers[d.id] ?? '').trim() && answers[d.id] !== d.answer && (
                      <button onClick={() => saveAnswer(d)} className="text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded-md px-2.5 py-1">Save answer</button>
                    )}
                    <button onClick={() => resolve(d)} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-2.5 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                    </button>
                  </div>
                </div>
              ) : d.askedByEmail === user.email && (
                <div className="pl-4 flex justify-end">
                  <button onClick={() => resolve(d)} className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-md px-2 py-1" title="My doubt is cleared">
                    ✓ Cleared it myself
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <div className="border-t border-slate-100">
          <button onClick={() => setShowResolved((v) => !v)} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">
            {showResolved ? '▾' : '▸'} Resolved doubts ({resolved.length})
          </button>
          {showResolved && (
            <ul className="divide-y divide-slate-100">
              {resolved.slice(0, 30).map((d) => (
                <li key={d.id} className="px-4 py-2 text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-slate-500">{doubtPlace(d)}</div>
                    <div className="text-slate-700 whitespace-pre-wrap break-words">{d.text}</div>
                    {d.answer && <div className="text-emerald-900 whitespace-pre-wrap"><strong>Answer:</strong> {d.answer}</div>}
                    <div className="text-[11px] text-slate-400">Resolved by {d.resolvedBy}{d.resolvedAt ? ` · ${new Date(d.resolvedAt).toLocaleDateString()}` : ''}</div>
                  </div>
                  {isHost && (
                    <button onClick={() => updateDoubt(d.id, { status: 'Open' })} className="p-1 text-slate-400 hover:text-amber-700" title="Re-open" aria-label="Re-open doubt">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** "?" icon — HelpCircle was renamed in newer lucide versions, so draw it here. */
function HelpCircleIcon() {
  return (
    <span className="h-5 w-5 rounded-full border-2 border-amber-600 text-amber-700 text-[11px] font-black flex items-center justify-center" aria-hidden="true">?</span>
  );
}
