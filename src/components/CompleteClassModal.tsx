/**
 * CompleteClassModal — after a class, the tutor records what was covered.
 *
 * Saving:
 *  - marks the class "Held" with the topics covered, homework and notes;
 *  - (optional, on by default) adds a "Tutor" entry to the Daily Log for the
 *    class time, so it counts for streaks, study time, the weekly report,
 *    Syllabus progress — and schedules the usual 7/15/30-day revisions.
 */
import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { OnlineClass, ClassTopic, upsertClasses, localDateAndTimes } from '../lib/classes';
import { STORE_KEYS, readStore } from '../lib/storeKeys';
import { scheduleRevisionsForLog } from '../lib/revisionScheduler';

interface Props {
  cls: OnlineClass;
  syllabus: any[];
  onClose: () => void;
  onDone: (message: string) => void;
}

export default function CompleteClassModal({ cls, syllabus, onClose, onDone }: Props) {
  const { currentUser } = useAuth();
  const subject = syllabus.find((s) => String(s.id) === String(cls.subjectId));
  const [chapterId, setChapterId] = useState<string>(cls.chapterId ? String(cls.chapterId) : '');
  const chapter = subject?.chapters?.find((c: any) => String(c.id) === chapterId);
  const [covered, setCovered] = useState<string[]>((cls.plannedTopics || []).map((t) => t.topicId));
  const [homework, setHomework] = useState('');
  const [notes, setNotes] = useState('');
  const [addToLog, setAddToLog] = useState(true);

  const toggle = (id: string) => setCovered((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleSave = () => {
    // Topics covered (from the chosen chapter, plus any planned ones from other chapters)
    const fromChapter: ClassTopic[] = (chapter?.topics || [])
      .filter((t: any) => covered.includes(String(t.id)))
      .map((t: any) => ({ subjectId: String(subject.id), chapterId: String(chapter.id), topicId: String(t.id), name: t.name, chapterName: chapter.name }));
    const planned = (cls.plannedTopics || []).filter((t) => covered.includes(t.topicId) && !fromChapter.some((f) => f.topicId === t.topicId));
    const topicsCovered = [...fromChapter, ...planned];

    let logId: string | undefined;
    let revisionsAdded = false;
    if (addToLog) {
      const { date, timeFrom, timeTo } = localDateAndTimes(cls);
      logId = `${Date.now()}`;
      const log = {
        id: logId,
        date,
        logType: 'Tutor',
        category: subject?.category || 'Rock',
        timeFrom,
        timeTo,
        classStatus: 'Attended',
        teacherName: cls.tutorName || currentUser?.username,
        subjectId: cls.subjectId,
        subjectName: cls.subjectName,
        chapterId: topicsCovered[0]?.chapterId || cls.chapterId,
        chapterName: Array.from(new Set(topicsCovered.map((t) => t.chapterName).filter(Boolean))).join(', ') || cls.chapterName,
        topicId: topicsCovered.length > 1 ? topicsCovered.map((t) => t.topicId) : topicsCovered[0]?.topicId,
        topicName: topicsCovered.map((t) => t.name).join(', '),
        status: topicsCovered.length ? 'Completed' : 'In Progress',
        notes: [`Online class: ${cls.title}`, homework && `Homework: ${homework}`, notes].filter(Boolean).join(' · '),
      };
      const logs = readStore<any[]>(STORE_KEYS.dailyLogs, []);
      localStorage.setItem(STORE_KEYS.dailyLogs, JSON.stringify([log, ...logs]));
      if (topicsCovered.length && log.subjectId) revisionsAdded = !!scheduleRevisionsForLog(log);
    }

    upsertClasses([{
      ...cls,
      status: 'Held',
      outcome: {
        completedAt: new Date().toISOString(),
        completedBy: currentUser?.email,
        topicsCovered,
        homework: homework.trim() || undefined,
        notes: notes.trim() || undefined,
        logId,
      },
    }]);

    onDone(`Class completed${topicsCovered.length ? ` — ${topicsCovered.length} topic${topicsCovered.length === 1 ? '' : 's'} covered` : ''}${addToLog ? ', added to the Daily Log' : ''}${revisionsAdded ? ', revisions scheduled' : ''}.`);
  };

  const field = 'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm';
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Complete class</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-sm text-slate-600"><strong className="text-slate-900">{cls.title}</strong></div>

          {subject ? (
            <>
              <label className="text-sm block"><span className="block font-bold text-slate-700 mb-1">Chapter</span>
                <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={field}>
                  <option value="">— Choose —</option>
                  {(subject.chapters || []).map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </label>
              {chapter?.topics?.length > 0 && (
                <div className="text-sm">
                  <span className="block font-bold text-slate-700 mb-1">Topics covered</span>
                  <div className="space-y-1">
                    {chapter.topics.map((t: any) => (
                      <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={covered.includes(String(t.id))} onChange={() => toggle(String(t.id))} className="h-4 w-4 accent-emerald-600" />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">This class isn't linked to a subject, so no topics can be ticked.</p>
          )}

          <label className="text-sm block"><span className="block font-bold text-slate-700 mb-1">Homework (optional)</span>
            <input value={homework} onChange={(e) => setHomework(e.target.value)} maxLength={200} className={field} />
          </label>
          <label className="text-sm block"><span className="block font-bold text-slate-700 mb-1">Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} className={field} />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={addToLog} onChange={(e) => setAddToLog(e.target.checked)} className="h-4 w-4 mt-0.5 accent-emerald-600" />
            <span>Add to the Daily Log <span className="text-slate-500">(counts for streaks, study time and progress; schedules revisions for the topics covered)</span></span>
          </label>
        </div>
        <div className="border-t border-slate-100 p-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">Save</button>
        </div>
      </div>
    </div>
  );
}
