/**
 * ClassCard — one online class: time (in the viewer's zone, plus the tutor's
 * if different), status, Join button, and tutor actions.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, ExternalLink, Clock, CheckCircle2, XCircle, User, MessageSquare } from 'lucide-react';
import { OnlineClass, canJoin, displayStatus, formatClassTime, relativeStart } from '../lib/classes';
import { getDeviceTimeZone, zoneCity } from '../lib/timezone';

interface Props {
  cls: OnlineClass;
  now: number;
  isHost: boolean;
  onComplete?: (c: OnlineClass) => void;
  onCancel?: (c: OnlineClass) => void;
  compact?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  Upcoming: 'bg-slate-100 text-slate-700 border-slate-200',
  Live: 'bg-green-100 text-green-800 border-green-200',
  Held: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-slate-50 text-slate-400 border-slate-200 line-through',
  'Not completed': 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function ClassCard({ cls, now, isHost, onComplete, onCancel, compact }: Props) {
  const navigate = useNavigate();
  const status = displayStatus(cls, now);
  const joinable = canJoin(cls, now);
  const myTz = getDeviceTimeZone();
  const otherTz = cls.creatorTimeZone && cls.creatorTimeZone !== myTz ? cls.creatorTimeZone : null;

  const join = () => {
    if (cls.meetingType === 'link' && cls.meetingLink) window.open(cls.meetingLink, '_blank', 'noopener');
    else navigate(`/classes/${cls.id}/room`);
  };

  return (
    <div className={`bg-white border rounded-xl p-4 ${status === 'Live' ? 'border-green-300 shadow-sm' : 'border-slate-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900 truncate">{cls.title}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 ${STATUS_STYLE[status]}`}>
              {status === 'Live' ? '● Live now' : status}
            </span>
            {cls.seriesId && <span className="text-[10px] text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">weekly</span>}
          </div>
          <div className="text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatClassTime(cls)} · {cls.durationMin} min</span>
            {status === 'Upcoming' && <span className="text-indigo-700 font-semibold">{relativeStart(cls, now)}</span>}
            {cls.tutorName && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {cls.tutorName}</span>}
          </div>
          {otherTz && (
            <div className="text-[11px] text-slate-400 mt-0.5">Tutor's time: {formatClassTime(cls, otherTz)} ({zoneCity(otherTz)})</div>
          )}
          {!compact && cls.plannedTopics && cls.plannedTopics.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">Topics: {cls.plannedTopics.map((t) => t.name).join(', ')}</div>
          )}
          {!compact && cls.notes && <div className="text-xs text-slate-500 mt-1 italic">{cls.notes}</div>}
          {!compact && cls.outcome && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded p-2 mt-2">
              {cls.outcome.topicsCovered.length > 0 && <div><strong>Covered:</strong> {cls.outcome.topicsCovered.map((t) => t.name).join(', ')}</div>}
              {cls.outcome.homework && <div><strong>Homework:</strong> {cls.outcome.homework}</div>}
              {cls.outcome.notes && <div>{cls.outcome.notes}</div>}
            </div>
          )}
          {!compact && cls.status === 'Cancelled' && cls.cancelReason && (
            <div className="text-xs text-slate-500 mt-1">Cancelled: {cls.cancelReason}</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {cls.status === 'Scheduled' && (
            <button
              onClick={join}
              disabled={!joinable}
              title={joinable ? 'Join the class' : 'Join opens 10 minutes before the start'}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-300 rounded-lg px-4 py-2"
            >
              {cls.meetingType === 'link' ? <ExternalLink className="h-4 w-4" /> : <Video className="h-4 w-4" />} Join
            </button>
          )}
          {/* v1.5: class board & learning windows — before, during (external-link classes) and after a class */}
          {cls.status !== 'Cancelled' && !(cls.meetingType !== 'link' && joinable && cls.status === 'Scheduled') && (
            <button
              onClick={() => navigate(`/classes/${cls.id}/room`)}
              title="Questions, comments, notes, flashcards and quiz for this class"
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-2"
            >
              <MessageSquare className="h-4 w-4" /> Class board
            </button>
          )}
          {isHost && cls.status === 'Scheduled' && now >= new Date(cls.startUtc).getTime() && onComplete && (
            <button onClick={() => onComplete(cls)} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4" /> Complete
            </button>
          )}
          {isHost && cls.status === 'Scheduled' && onCancel && (
            <button onClick={() => onCancel(cls)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2">
              <XCircle className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
