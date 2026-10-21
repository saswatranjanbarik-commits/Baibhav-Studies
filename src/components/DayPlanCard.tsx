/**
 * DayPlanCard (v1.5) — "Plan for the day" on the Daily Plan & Log page.
 *
 *  Morning: the student adds what they plan to study (subject, chapter,
 *  topic, time). Through the day / evening: each planned item is closed with
 *    ✓ Done        → logged straight into the Daily Log as Completed
 *    Log details…  → opens the normal Daily Log form, pre-filled
 *  and the plan item is marked Completed / In Progress.
 *
 *  Plan items are the SAME records as the Study Plan page (dugu_study_plan,
 *  same fields), so reminders, the Study Plan page and the weekly report all
 *  see them. Only an optional `logId` field is added when an item is logged.
 */
import React, { useMemo, useState } from 'react';
import { CalendarCheck, Plus, Check, PencilLine, Trash2, X, Clock } from 'lucide-react';
import { todayStr } from '../lib/dates';

export interface PlanItem {
  id: string;
  subjectId: string; subjectName: string;
  chapterId: string; chapterName: string;
  topicId?: string; topicName?: string;
  subTopicId?: string; subTopicName?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  startDate: string;
  timeFrom?: string; timeTo?: string;
  planType?: string;
  weekNo?: string; learningIndex?: string; doubts?: string;
  logId?: string; // v1.5: the Daily Log entry this plan item was logged as
}

interface Props {
  date: string;
  plan: PlanItem[];
  syllabus: any[];
  /** Save the whole plan list (dugu_study_plan). */
  onSavePlan: (next: PlanItem[]) => void;
  /** One tap: log this item as done. */
  onQuickDone: (item: PlanItem) => void;
  /** Open the Daily Log form pre-filled from this item. */
  onLogDetails: (item: PlanItem) => void;
}

const PLAN_TYPES = ['Self Study', 'Teaching', 'Quiz', 'Flashcard', 'Task', 'Assessment'];

export default function DayPlanCard({ date, plan, syllabus, onSavePlan, onQuickDone, onLogDetails }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<PlanItem>>({ planType: 'Self Study' });

  const items = useMemo(
    () => (Array.isArray(plan) ? plan : [])
      .filter((p) => p.startDate === date)
      .sort((a, b) => (a.timeFrom || '99:99').localeCompare(b.timeFrom || '99:99')),
    [plan, date],
  );
  const done = items.filter((p) => p.status === 'Completed').length;

  const subject = syllabus.find((s) => s.id === draft.subjectId);
  const chapter = subject?.chapters?.find((c: any) => c.id === draft.chapterId);
  const topic = chapter?.topics?.find((t: any) => t.id === draft.topicId);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.subjectId || !draft.chapterId) return;
    const item: PlanItem = {
      id: Date.now().toString(),
      subjectId: draft.subjectId, subjectName: subject?.name || '',
      chapterId: draft.chapterId, chapterName: chapter?.name || '',
      topicId: draft.topicId || '', topicName: topic?.name || '',
      subTopicId: '', subTopicName: '',
      status: 'Pending',
      startDate: date,
      timeFrom: draft.timeFrom || undefined,
      timeTo: draft.timeTo || undefined,
      planType: draft.planType || 'Self Study',
      weekNo: '1', learningIndex: '1.1', doubts: '',
    };
    // drop undefined values (cleaner records)
    (Object.keys(item) as (keyof PlanItem)[]).forEach((k) => item[k] === undefined && delete item[k]);
    onSavePlan([item, ...plan]);
    setDraft({ planType: draft.planType, timeFrom: draft.timeTo }); // next slot starts where this one ended
    setAdding(false);
  };

  const remove = (item: PlanItem) => {
    if (!window.confirm(`Remove "${item.topicName || item.chapterName}" from the plan?`)) return;
    onSavePlan(plan.filter((p) => p.id !== item.id));
  };

  const isToday = date === todayStr();
  const isPast = date < todayStr();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-indigo-50/60 flex flex-wrap items-center gap-3">
        <CalendarCheck className="h-5 w-5 text-indigo-600" />
        <div className="mr-auto">
          <h3 className="font-bold text-slate-900">{isToday ? "Today's plan" : `Plan for ${date}`}</h3>
          <p className="text-xs text-slate-500">
            {items.length
              ? `${done} of ${items.length} done${done < items.length ? ' — tap ✓ Done when you finish each one' : ' 🎉'}`
              : isPast ? 'Nothing was planned for this day.' : 'Plan what you will study, then tick it off — it goes into your Daily Log.'}
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5">
            <Plus className="h-4 w-4" /> Plan a session
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={addItem} className="p-4 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50">
          <select required value={draft.subjectId || ''} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value, chapterId: '', topicId: '' })} className="col-span-2 sm:col-span-2 text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white">
            <option value="">Subject…</option>
            {syllabus.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select required disabled={!subject} value={draft.chapterId || ''} onChange={(e) => setDraft({ ...draft, chapterId: e.target.value, topicId: '' })} className="col-span-2 sm:col-span-2 text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white disabled:bg-slate-100">
            <option value="">Chapter…</option>
            {subject?.chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select disabled={!chapter} value={draft.topicId || ''} onChange={(e) => setDraft({ ...draft, topicId: e.target.value })} className="col-span-2 sm:col-span-2 text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white disabled:bg-slate-100">
            <option value="">Topic (optional)</option>
            {chapter?.topics?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <label className="text-xs text-slate-600 flex items-center gap-1">From <input type="time" value={draft.timeFrom || ''} onChange={(e) => setDraft({ ...draft, timeFrom: e.target.value })} className="flex-1 min-w-0 text-sm border border-slate-300 rounded-md px-1 py-1" /></label>
          <label className="text-xs text-slate-600 flex items-center gap-1">To <input type="time" value={draft.timeTo || ''} onChange={(e) => setDraft({ ...draft, timeTo: e.target.value })} className="flex-1 min-w-0 text-sm border border-slate-300 rounded-md px-1 py-1" /></label>
          <select value={draft.planType || 'Self Study'} onChange={(e) => setDraft({ ...draft, planType: e.target.value })} className="col-span-2 sm:col-span-2 text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white">
            {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="col-span-2 sm:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="text-sm font-semibold text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-200 inline-flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
            <button type="submit" className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md px-3 py-1.5">Add to plan</button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.map((p) => {
            const completed = p.status === 'Completed';
            return (
              <li key={p.id} className={`px-4 py-2.5 flex flex-wrap items-center gap-3 ${completed ? 'bg-emerald-50/50' : ''}`}>
                <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${completed ? 'bg-emerald-500 text-white' : p.status === 'In Progress' ? 'bg-amber-400 text-white' : 'border-2 border-slate-300'}`}>
                  {completed && <Check className="h-4 w-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {p.topicName || p.chapterName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
                    <span>{p.subjectName}{p.topicName ? ` · ${p.chapterName}` : ''}</span>
                    {(p.timeFrom || p.timeTo) && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" /> {p.timeFrom || '?'}–{p.timeTo || '?'}</span>}
                    {p.planType && <span>{p.planType}</span>}
                    {completed && p.logId && <span className="text-emerald-700 font-semibold">logged ✓</span>}
                    {p.status === 'In Progress' && <span className="text-amber-700 font-semibold">in progress</span>}
                  </div>
                </div>
                {!completed && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => onQuickDone(p)} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-2.5 py-1.5" title="Log it in the Daily Log as completed">
                      <Check className="h-3.5 w-3.5" /> Done
                    </button>
                    <button onClick={() => onLogDetails(p)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded-md px-2 py-1.5" title="Open the Daily Log form to add notes, times, doubts…">
                      <PencilLine className="h-3.5 w-3.5" /> Log details…
                    </button>
                    {p.status === 'Pending' && (
                      <button onClick={() => remove(p)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md" aria-label="Remove from plan" title="Remove from plan">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
