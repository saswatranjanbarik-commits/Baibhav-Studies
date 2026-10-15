/**
 * ScheduleClassModal — tutor/admin schedules an online class (or a weekly series).
 * The time is entered in the scheduler's OWN local time; everyone else sees it
 * converted to theirs.
 */
import React, { useMemo, useState } from 'react';
import { CalendarPlus, X, Video, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTeamUsers } from '../lib/useTeamUsers';
import { createClasses, ClassTopic } from '../lib/classes';
import { getDeviceTimeZone, getOffsetLabel } from '../lib/timezone';

interface Props {
  syllabus: any[];
  onClose: () => void;
  onCreated: (message: string) => void;
}

/** Next full hour as "YYYY-MM-DDTHH:00" local. */
function nextHourLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

export default function ScheduleClassModal({ syllabus, onClose, onCreated }: Props) {
  const { currentUser } = useAuth();
  const teachers = useTeamUsers().filter((u) => u.role === 'Teacher' || u.role === 'Admin');
  const isTeacher = currentUser?.role === 'Teacher';

  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(nextHourLocal());
  const [durationMin, setDurationMin] = useState(60);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [meetingType, setMeetingType] = useState<'in-app' | 'link'>('in-app');
  const [meetingLink, setMeetingLink] = useState('');
  const [tutorEmail, setTutorEmail] = useState(isTeacher ? currentUser?.email || '' : '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const subject = syllabus.find((s) => String(s.id) === subjectId);
  const chapter = subject?.chapters?.find((c: any) => String(c.id) === chapterId);
  const tz = getDeviceTimeZone();

  const tutor = useMemo(() => {
    if (isTeacher) return { email: currentUser?.email, name: currentUser?.username };
    const t = teachers.find((u) => u.email === tutorEmail);
    return t ? { email: t.email, name: t.username } : { email: undefined, name: undefined };
  }, [isTeacher, currentUser, teachers, tutorEmail]);

  const toggleTopic = (id: string) =>
    setTopicIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (meetingType === 'link' && !/^https?:\/\//i.test(meetingLink.trim())) {
      setError('Please paste the full meeting link (starting with https://).');
      return;
    }
    const plannedTopics: ClassTopic[] = (chapter?.topics || [])
      .filter((t: any) => topicIds.includes(String(t.id)))
      .map((t: any) => ({ subjectId: String(subject.id), chapterId: String(chapter.id), topicId: String(t.id), name: t.name, chapterName: chapter.name }));
    const autoTitle = [subject?.name, chapter?.name].filter(Boolean).join(' – ') || 'Online class';
    try {
      const created = createClasses({
        title: title.trim() || autoTitle,
        subjectId: subject ? String(subject.id) : undefined,
        subjectName: subject?.name,
        chapterId: chapter ? String(chapter.id) : undefined,
        chapterName: chapter?.name,
        plannedTopics,
        localDateTime: when,
        durationMin,
        repeatWeeks,
        meetingType,
        meetingLink: meetingType === 'link' ? meetingLink.trim() : undefined,
        notes: notes.trim() || undefined,
        tutorEmail: tutor.email,
        tutorName: tutor.name,
        createdBy: currentUser?.email,
      });
      onCreated(created.length > 1 ? `${created.length} weekly classes scheduled.` : 'Class scheduled.');
    } catch (err: any) {
      setError(err?.message || 'Could not schedule the class.');
    }
  };

  const field = 'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm';
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-indigo-600" /> Schedule a class</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <div className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg p-2.5">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm"><span className="block font-bold text-slate-700 mb-1">Subject</span>
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(''); setTopicIds([]); }} className={field}>
                <option value="">— Any / general —</option>
                {syllabus.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="block font-bold text-slate-700 mb-1">Chapter</span>
              <select value={chapterId} onChange={(e) => { setChapterId(e.target.value); setTopicIds([]); }} disabled={!subject} className={`${field} disabled:bg-slate-50`}>
                <option value="">— Optional —</option>
                {(subject?.chapters || []).map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </label>
          </div>

          {chapter?.topics?.length > 0 && (
            <div className="text-sm">
              <span className="block font-bold text-slate-700 mb-1">Planned topics (optional)</span>
              <div className="flex flex-wrap gap-1.5">
                {chapter.topics.map((t: any) => (
                  <button
                    type="button" key={t.id} onClick={() => toggleTopic(String(t.id))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${topicIds.includes(String(t.id)) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}
                  >{t.name}</button>
                ))}
              </div>
            </div>
          )}

          <label className="text-sm block"><span className="block font-bold text-slate-700 mb-1">Title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={[subject?.name, chapter?.name].filter(Boolean).join(' – ') || 'Online class'} className={field} maxLength={80} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm sm:col-span-2"><span className="block font-bold text-slate-700 mb-1">Starts (your time)</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className={field} />
              <span className="text-[11px] text-slate-500">{tz} ({getOffsetLabel(tz)}) — others see it in their own time</span>
            </label>
            <label className="text-sm"><span className="block font-bold text-slate-700 mb-1">Length</span>
              <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={field}>
                {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm"><span className="block font-bold text-slate-700 mb-1">Repeat</span>
              <select value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value))} className={field}>
                <option value={1}>Just once</option>
                <option value={4}>Weekly for 4 weeks</option>
                <option value={8}>Weekly for 8 weeks</option>
                <option value={12}>Weekly for 12 weeks</option>
              </select>
            </label>
            {!isTeacher && (
              <label className="text-sm"><span className="block font-bold text-slate-700 mb-1">Tutor</span>
                <select value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} className={field}>
                  <option value="">— Choose —</option>
                  {teachers.map((t) => <option key={t.email} value={t.email}>{t.username} ({t.role})</option>)}
                </select>
              </label>
            )}
          </div>

          <div className="text-sm">
            <span className="block font-bold text-slate-700 mb-1">Video</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={`flex items-start gap-2 border rounded-lg p-2.5 cursor-pointer ${meetingType === 'in-app' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                <input type="radio" checked={meetingType === 'in-app'} onChange={() => setMeetingType('in-app')} className="mt-1 accent-indigo-600" />
                <span><span className="font-semibold flex items-center gap-1"><Video className="h-4 w-4" /> Inside EduTrack</span><span className="text-xs text-slate-500">Private video room, no other app needed</span></span>
              </label>
              <label className={`flex items-start gap-2 border rounded-lg p-2.5 cursor-pointer ${meetingType === 'link' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                <input type="radio" checked={meetingType === 'link'} onChange={() => setMeetingType('link')} className="mt-1 accent-indigo-600" />
                <span><span className="font-semibold flex items-center gap-1"><LinkIcon className="h-4 w-4" /> Meeting link</span><span className="text-xs text-slate-500">e.g. Google Meet / Zoom</span></span>
              </label>
            </div>
            {meetingType === 'link' && (
              <input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/…" className={`${field} mt-2`} />
            )}
          </div>

          <label className="text-sm block"><span className="block font-bold text-slate-700 mb-1">Notes for the student (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} className={field} placeholder="Bring your maths notebook…" />
          </label>
        </div>

        <div className="border-t border-slate-100 p-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            {repeatWeeks > 1 ? `Schedule ${repeatWeeks} classes` : 'Schedule class'}
          </button>
        </div>
      </form>
    </div>
  );
}
