/**
 * TopicCompletionModal — lets a tutor/admin tick off many topics of one
 * subject as completed in one go (e.g. everything covered before the mid-term).
 *
 * - Ticked = completed. Topics already completed through the Daily Log are
 *   shown ticked and locked (they're completed by real study records).
 * - Unticking a topic that was marked here removes the mark.
 * - Quick selects: whole chapter, whole subject, or all Term-1 chapters.
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, X, ListChecks } from 'lucide-react';
import { todayStr } from '../lib/dates';
import { saveTopicMarks, TopicRef } from '../lib/topicStatus';

interface Topic { id: string; name: string }
interface Chapter { id: string; name: string; term?: string; topics: Topic[] }
interface Subject { id: string; name: string; chapters: Chapter[] }

interface Props {
  subject: Subject;
  /** Current status of a topic (from marks, logs and plan). */
  statusOf: (topicId: string) => string;
  /** Is this topic's "Completed" coming from a tutor mark (vs. the Daily Log)? */
  isMarked: (topicId: string) => boolean;
  markedBy: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function TopicCompletionModal({ subject, statusOf, isMarked, markedBy, onClose, onSaved }: Props) {
  // Topics completed by Daily Log entries (not by a mark) can't be unticked here.
  const lockedIds = useMemo(() => {
    const s = new Set<string>();
    subject.chapters.forEach((c) => c.topics.forEach((t) => {
      if (statusOf(t.id) === 'Completed' && !isMarked(t.id)) s.add(t.id);
    }));
    return s;
  }, [subject, statusOf, isMarked]);

  const initiallyChecked = useMemo(() => {
    const s = new Set<string>();
    subject.chapters.forEach((c) => c.topics.forEach((t) => { if (statusOf(t.id) === 'Completed') s.add(t.id); }));
    return s;
  }, [subject, statusOf]);

  const [checked, setChecked] = useState<Set<string>>(new Set(initiallyChecked));
  const [completedOn, setCompletedOn] = useState(todayStr());
  const [note, setNote] = useState('Covered in class');

  const allTopics = subject.chapters.flatMap((c) => c.topics.map((t) => ({ chapter: c, topic: t })));
  const hasTerm1 = subject.chapters.some((c) => c.term === 'Term-1');

  const setMany = (ids: string[], value: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => { if (lockedIds.has(id)) return; value ? next.add(id) : next.delete(id); });
      return next;
    });

  const toggle = (id: string) => setMany([id], !checked.has(id));

  const toMark: TopicRef[] = allTopics
    .filter(({ topic }) => checked.has(topic.id) && !lockedIds.has(topic.id) && !isMarked(topic.id))
    .map(({ chapter, topic }) => ({ subjectId: subject.id, chapterId: chapter.id, topicId: topic.id, topicName: topic.name }));
  const toClear = allTopics
    .filter(({ topic }) => !checked.has(topic.id) && isMarked(topic.id))
    .map(({ topic }) => topic.id);

  const handleSave = () => {
    const { marked, cleared } = saveTopicMarks(toMark, toClear, { by: markedBy, completedOn, note: note.trim() || undefined });
    const parts = [];
    if (marked) parts.push(`${marked} topic${marked === 1 ? '' : 's'} marked completed`);
    if (cleared) parts.push(`${cleared} mark${cleared === 1 ? '' : 's'} removed`);
    onSaved(parts.length ? `${subject.name}: ${parts.join(', ')}.` : 'No changes.');
  };

  const changes = toMark.length + toClear.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-600" /> Mark topics completed — {subject.name}
          </h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        {/* Quick selects */}
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          <button onClick={() => setMany(allTopics.map((x) => x.topic.id), true)} className="text-xs font-semibold border border-slate-300 rounded-full px-3 py-1 hover:bg-slate-50">Select all</button>
          {hasTerm1 && (
            <button
              onClick={() => setMany(subject.chapters.filter((c) => c.term === 'Term-1').flatMap((c) => c.topics.map((t) => t.id)), true)}
              className="text-xs font-semibold border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-full px-3 py-1 hover:bg-indigo-100"
            >
              Select all Term-1 chapters
            </button>
          )}
          <button onClick={() => setMany(allTopics.map((x) => x.topic.id), false)} className="text-xs font-semibold border border-slate-300 rounded-full px-3 py-1 hover:bg-slate-50">Clear selection</button>
        </div>

        {/* Checklist */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {subject.chapters.length === 0 && <p className="text-sm text-slate-500">This subject has no chapters yet.</p>}
          {subject.chapters.map((c) => {
            const ids = c.topics.map((t) => t.id);
            const done = ids.filter((id) => checked.has(id)).length;
            return (
              <div key={c.id} className="border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-t-lg">
                  <div className="font-semibold text-slate-800 text-sm">
                    {c.name}
                    {c.term && <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">{c.term}</span>}
                    <span className="ml-2 text-xs font-normal text-slate-500">{done}/{ids.length}</span>
                  </div>
                  {ids.length > 0 && (
                    <button
                      onClick={() => setMany(ids, done < ids.length)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      {done < ids.length ? 'Tick whole chapter' : 'Untick chapter'}
                    </button>
                  )}
                </div>
                <ul className="p-2">
                  {c.topics.length === 0 && <li className="text-xs text-slate-400 px-2 py-1">No topics</li>}
                  {c.topics.map((t) => {
                    const locked = lockedIds.has(t.id);
                    return (
                      <li key={t.id}>
                        <label className={`flex items-center gap-2 px-2 py-1.5 rounded ${locked ? 'opacity-70' : 'hover:bg-slate-50 cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-emerald-600"
                            checked={checked.has(t.id)}
                            disabled={locked}
                            onChange={() => toggle(t.id)}
                          />
                          <span className="text-sm text-slate-700 flex-1">{t.name}</span>
                          {locked && <span className="text-[10px] text-slate-500">completed in Daily Log</span>}
                          {!locked && isMarked(t.id) && <span className="text-[10px] text-emerald-700">marked earlier</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Details + save */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block font-bold text-slate-700 mb-1">Completed on</span>
              <input type="date" value={completedOn} max={todayStr()} onChange={(e) => setCompletedOn(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
            </label>
            <label className="text-sm">
              <span className="block font-bold text-slate-700 mb-1">Note (optional)</span>
              <input type="text" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              {changes === 0 ? 'No changes yet' : `${toMark.length} to mark${toClear.length ? `, ${toClear.length} to unmark` : ''}`}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} disabled={changes === 0} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
