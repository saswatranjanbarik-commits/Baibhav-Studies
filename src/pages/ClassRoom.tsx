/**
 * ClassRoom (v1.4) — the in-app video room for one class, full screen.
 *
 * Gets a personal, time-limited pass from /api/video-room and shows the
 * private Daily.co room in a frame. Camera/microphone permission is asked
 * by the browser the first time.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, Video } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { STORE_KEYS } from '../lib/storeKeys';
import { useStoredData } from '../lib/useStoredData';
import { OnlineClass, canJoin, endMs, formatClassTime } from '../lib/classes';
import { getRoomPass, RoomPass } from '../lib/videoRoom';
import DailyFrame from '../components/DailyFrame';
import CompleteClassModal from '../components/CompleteClassModal';
import { usePresenceHeartbeat } from '../lib/presence';

export default function ClassRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isHost = currentUser?.role === 'Teacher' || currentUser?.role === 'Admin';
  const classes = useStoredData<OnlineClass[]>(STORE_KEYS.classes, []);
  const syllabus = useStoredData<any[]>(STORE_KEYS.syllabus, []);
  const cls = classes.find((c) => c.id === id);
  // Stay "online" for the team while in class (this page sits outside the main layout).
  usePresenceHeartbeat(currentUser);

  const [pass, setPass] = useState<RoomPass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!cls || pass || loading) return;
    if (cls.meetingType === 'link') return;
    if (!canJoin(cls)) return;
    setLoading(true);
    getRoomPass(cls).then((r) => {
      setLoading(false);
      if (r.pass) setPass(r.pass);
      else { setError(r.error || 'Could not open the class room.'); setNotConfigured(!!r.notConfigured); }
    });
  }, [cls?.id, cls ? canJoin(cls, now) : false]); // re-try when the join window opens

  const leave = () => {
    if (isHost && cls?.status === 'Scheduled') setShowComplete(true);
    else navigate('/classes');
  };

  const minsLeft = cls ? Math.round((endMs(cls) - now) / 60_000) : 0;

  let body: React.ReactNode;
  if (!cls) {
    body = <Message icon="warn" text="This class could not be found. It may have been removed." />;
  } else if (cls.meetingType === 'link') {
    body = (
      <Message icon="video" text="This class uses an external meeting link.">
        {cls.meetingLink && <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block bg-green-600 text-white font-semibold rounded-lg px-4 py-2">Open meeting</a>}
      </Message>
    );
  } else if (!canJoin(cls, now) && !pass) {
    body = <Message icon="video" text={cls.status !== 'Scheduled' ? `This class is ${cls.status.toLowerCase()}.` : `The room opens 10 minutes before the class (${formatClassTime(cls)}).`} />;
  } else if (loading) {
    body = <Message icon="load" text="Opening the class room…" />;
  } else if (error) {
    body = (
      <Message icon="warn" text={error}>
        {notConfigured && currentUser?.role === 'Admin' && <p className="text-xs text-slate-400 mt-2">Admin: see "In-app video setup" in UPGRADE_NOTES.md.</p>}
        {cls.meetingLink && <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-300 underline">Use the backup meeting link instead</a>}
      </Message>
    );
  } else if (pass) {
    body = <DailyFrame pass={pass} title={cls.title} onLeft={leave} />;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900 flex flex-col">
      <div className="h-12 shrink-0 flex items-center gap-3 px-3 bg-[#1F4E79] text-white">
        <button onClick={leave} className="inline-flex items-center gap-1 text-sm font-semibold bg-white/10 hover:bg-white/20 rounded-md px-3 py-1.5">
          <ArrowLeft className="h-4 w-4" /> Leave
        </button>
        <div className="flex-1 min-w-0 truncate font-semibold text-sm">{cls?.title || 'Class'}</div>
        {cls && cls.status === 'Scheduled' && minsLeft > 0 && minsLeft < 600 && (
          <span className="text-xs text-indigo-100 whitespace-nowrap">{minsLeft} min left</span>
        )}
      </div>
      <div className="flex-1 min-h-0">{body}</div>
      {showComplete && cls && (
        <CompleteClassModal
          cls={cls}
          syllabus={syllabus}
          onClose={() => { setShowComplete(false); navigate('/classes'); }}
          onDone={() => { setShowComplete(false); navigate('/classes'); }}
        />
      )}
    </div>
  );
}

function Message({ icon, text, children }: { icon: 'warn' | 'video' | 'load'; text: string; children?: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-slate-200 p-6">
      {icon === 'warn' && <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />}
      {icon === 'video' && <Video className="h-10 w-10 text-indigo-300 mb-3" />}
      {icon === 'load' && <Loader2 className="h-10 w-10 text-indigo-300 mb-3 animate-spin" />}
      <p className="max-w-md">{text}</p>
      {children}
    </div>
  );
}
