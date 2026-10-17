/**
 * ClassRoom — the class room for one online class, full screen.
 *
 * v1.4: gets a personal, time-limited pass from /api/video-room and shows the
 *       private Daily.co video room.
 * v1.5: split screen with up to three windows, each can be switched on/off
 *       from the header and resized by dragging the dividers:
 *         1. Video
 *         2. Questions & comments — live class board + "My notes"
 *         3. Learning — study notes, flashcards, quiz for the class topics
 *         4. Whiteboard — live shared drawing board (off until switched on)
 *       Tutor/Admin can "Present to class": students' Learning window then
 *       shows exactly what the tutor opens. Everyone gets Share screen /
 *       Chat buttons for the video in the header.
 *       The layout is remembered on each device (see lib/classroomLayout.ts).
 *       The video stays connected while windows are resized or switched off.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, Video, MessageSquare, BookOpen, RotateCcw, PenTool } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { STORE_KEYS } from '../lib/storeKeys';
import { useStoredData } from '../lib/useStoredData';
import { OnlineClass, canJoin, endMs, formatClassTime } from '../lib/classes';
import { getRoomPass, RoomPass } from '../lib/videoRoom';
import DailyFrame from '../components/DailyFrame';
import CompleteClassModal from '../components/CompleteClassModal';
import { usePresenceHeartbeat } from '../lib/presence';
import {
  ClassroomLayout, ClassroomPanel, DEFAULT_LAYOUT, loadLayout, saveLayout, togglePanel, revealPanel, isWideScreen,
  normaliseLayout,
} from '../lib/classroomLayout';
import {
  ClassMessage, SharedItem, BoardMeta, PresentView, listenToClassBoard, postMessage, newMessageId, openQuestionCount, setWhiteboardPage,
  setPresent, setSharedLayout,
} from '../lib/classChat';
import ResizeHandle from '../components/classroom/ResizeHandle';
import QuestionsPanel from '../components/classroom/QuestionsPanel';
import LearningPanel, { LearningFocus, LearningTab } from '../components/classroom/LearningPanel';
import Whiteboard from '../components/classroom/Whiteboard';
import VideoControls from '../components/classroom/VideoControls';
import DictationButton from '../components/DictationButton';

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

  // ---- v1.5: window layout -------------------------------------------------
  const [layout, setLayoutState] = useState<ClassroomLayout>(loadLayout);
  // Only the tutor/admin can open/close or resize windows; students use the
  // tutor's layout (synced below). Narrow-screen tabs stay free for everyone.
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const setLayout = useCallback((update: ClassroomLayout | ((l: ClassroomLayout) => ClassroomLayout)) => {
    if (isHostRef.current) setLayoutState(update);
  }, []);
  const [wide, setWide] = useState(() => isWideScreen(window.innerWidth, window.innerHeight));
  const mainRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHost) return; // students' layout comes from the tutor
    const t = setTimeout(() => saveLayout(layout), 300); // remember on this device
    return () => clearTimeout(t);
  }, [layout, isHost]);

  useEffect(() => {
    const onResize = () => setWide(isWideScreen(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- v1.5: live class board ------------------------------------------------
  const [messages, setMessages] = useState<Record<string, ClassMessage>>({});
  const [boardMeta, setBoardMeta] = useState<BoardMeta>({ wbPage: 1, wbPages: 1, present: null, layout: null });
  const [boardError, setBoardError] = useState<string | null>(null);
  const [focus, setFocus] = useState<LearningFocus | null>(null);

  useEffect(() => {
    if (!cls?.id) return;
    setBoardError(null);
    return listenToClassBoard(cls.id, (m, meta) => { setMessages(m); setBoardMeta(meta); setBoardError(null); }, setBoardError);
  }, [cls?.id]);

  // ---- v1.5: the tutor's layout is the class layout ------------------------------------
  const lastSharedLayout = useRef('');
  const layoutKey = (l: Pick<ClassroomLayout, 'show' | 'mainRatio' | 'stageRatio' | 'sideRatio'>) =>
    JSON.stringify([l.show.video, l.show.whiteboard, l.show.questions, l.show.learning,
      l.mainRatio.toFixed(3), l.stageRatio.toFixed(3), l.sideRatio.toFixed(3)]);

  // Apply the shared layout (students always; a second tutor/admin too).
  useEffect(() => {
    const shared = boardMeta.layout;
    if (!shared || (isHost && shared.by === currentUser?.email)) return;
    const next = normaliseLayout(shared);
    lastSharedLayout.current = layoutKey(next);
    setLayoutState((l) => ({ ...next, stageTab: isHost ? next.stageTab : l.stageTab, sideTab: isHost ? next.sideTab : l.sideTab }));
  }, [boardMeta.layout?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tutor/admin: publish layout changes (dragging sends one update when the drag pauses).
  useEffect(() => {
    if (!isHost || !cls || !currentUser) return;
    const key = layoutKey(layout);
    if (key === lastSharedLayout.current) return;
    const t = setTimeout(() => {
      lastSharedLayout.current = key;
      setSharedLayout(cls.id, {
        show: { ...layout.show },
        mainRatio: layout.mainRatio, stageRatio: layout.stageRatio, sideRatio: layout.sideRatio,
        stageTab: layout.stageTab, sideTab: layout.sideTab,
        by: currentUser.email, at: new Date().toISOString(),
      }).catch((e) => console.warn('Could not share the layout', e));
    }, 300);
    return () => clearTimeout(t);
  }, [layout, isHost, cls?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- v1.5: presenting the Learning window --------------------------------------
  const present = boardMeta.present;
  const iAmPresenting = !!present && !!currentUser && present.by === currentUser.email;
  /** startedAt of a presentation this user chose not to follow ("Browse myself"). */
  const [skippedPresentation, setSkippedPresentation] = useState<string | null>(null);
  const following = !!present && !iAmPresenting && skippedPresentation !== present.startedAt;
  const presentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const presentingRef = useRef(false);
  const presentStartRef = useRef('');
  presentingRef.current = iAmPresenting;

  // A new presentation starts → followers' Learning window opens in front.
  useEffect(() => {
    if (present && !iAmPresenting && skippedPresentation !== present.startedAt) {
      setLayout((l) => revealPanel(l, 'learning'));
    }
  }, [present?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendPresent = useCallback((view: PresentView, startedAt: string) => {
    if (!cls || !currentUser) return;
    if (presentTimer.current) clearTimeout(presentTimer.current);
    // Small delay so quick clicks send one update.
    presentTimer.current = setTimeout(() => {
      setPresent(cls.id, {
        ...view,
        by: currentUser.email,
        byName: currentUser.username || currentUser.email,
        startedAt,
        at: new Date().toISOString(),
      }).catch((e) => { console.warn(e); setBoardError('Could not update the presentation. Check the connection.'); });
    }, 250);
  }, [cls?.id, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePresent = () => {
    if (!cls) return;
    if (iAmPresenting) {
      if (presentTimer.current) clearTimeout(presentTimer.current);
      setPresent(cls.id, null).catch((e) => console.warn(e));
    } else {
      presentStartRef.current = new Date().toISOString();
      sendPresent({ tab: 'notes', label: 'Notes list' }, presentStartRef.current);
    }
  };
  const onPresentView = useCallback((view: PresentView) => {
    sendPresent(view, present?.startedAt || presentStartRef.current || new Date().toISOString());
  }, [sendPresent, present?.startedAt]);

  // Leaving the class room stops a presentation.
  useEffect(() => () => {
    if (presentTimer.current) clearTimeout(presentTimer.current);
    if (presentingRef.current && cls?.id) setPresent(cls.id, null).catch(() => {});
  }, [cls?.id]);

  // ---- v1.5: the joined video call (for the Share screen / Chat buttons) -----------
  const [frame, setFrame] = useState<any | null>(null);

  /** Whiteboard pages are shared: changing page moves everyone. */
  const changeBoardPage = useCallback((page: number, pages?: number) => {
    if (!cls) return;
    setWhiteboardPage(cls.id, page, pages).catch((e) => { console.warn(e); setBoardError('Could not change the whiteboard page.'); });
  }, [cls?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openInLearning = useCallback((tab: LearningTab, itemId: string) => {
    setFocus({ tab, itemId, nonce: Date.now() });
    setLayout((l) => revealPanel(l, 'learning'));
  }, []);

  const shareToBoard = useCallback((item: SharedItem) => {
    if (!cls || !currentUser) return;
    postMessage(cls.id, {
      id: newMessageId(),
      kind: 'share',
      text: '',
      authorEmail: currentUser.email,
      authorName: currentUser.username || currentUser.email,
      authorRole: currentUser.role,
      createdAt: new Date().toISOString(),
      share: item,
    }).catch((e) => { console.warn(e); setBoardError('Could not share that item. Check the connection.'); });
    // Make sure the board is visible (on wide screens; on narrow ones the user stays on Learning).
    setLayout((l) => (l.show.questions ? l : { ...l, show: { ...l.show, questions: true } }));
  }, [cls?.id, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

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
    body = <Message icon="video" text={cls.status !== 'Scheduled' ? `This class is ${cls.status.toLowerCase()}. The class board and learning windows are still available.` : `The video opens 10 minutes before the class (${formatClassTime(cls)}). You can already use the learning windows.`} />;
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
    body = <DailyFrame pass={pass} title={cls.title} onLeft={leave} onFrame={setFrame} />;
  }

  // ---- Sizes -----------------------------------------------------------------
  // The windows are always rendered in the same order so the video frame is
  // never re-created (which would drop the call) when the layout changes.
  //   left column  ("stage") = Video + Whiteboard
  //   right column ("side")  = Learning + Questions
  const hasClass = !!cls && !!currentUser;
  const show = hasClass ? layout.show : { video: true, whiteboard: false, questions: false, learning: false };
  const stageShown = show.video || show.whiteboard;
  const sideShown = show.questions || show.learning;
  const bothStage = show.video && show.whiteboard;
  const bothSide = show.questions && show.learning;
  const stageTabbed = !wide && bothStage; // narrow screens: Video / Whiteboard as tabs
  const sideTabbed = !wide && bothSide;   // narrow screens: Learning / Questions as tabs

  /** Style for one window: hidden, a fixed share, or "fill the rest". */
  const paneStyle = (visible: boolean, share: number | null): React.CSSProperties =>
    !visible ? { display: 'none' } : share !== null ? { flex: `0 0 ${share * 100}%` } : { flex: '1 1 0%' };

  const stageStyle = paneStyle(stageShown, sideShown ? layout.mainRatio : null);
  const sideStyle = paneStyle(sideShown, null);
  const videoStyle = paneStyle(show.video && !(stageTabbed && layout.stageTab !== 'video'), bothStage && !stageTabbed ? layout.stageRatio : null);
  const boardStyle = paneStyle(show.whiteboard && !(stageTabbed && layout.stageTab !== 'whiteboard'), null);
  const learningStyle = paneStyle(show.learning && !(sideTabbed && layout.sideTab !== 'learning'), bothSide && !sideTabbed ? layout.sideRatio : null);
  const questionsStyle = paneStyle(show.questions && !(sideTabbed && layout.sideTab !== 'questions'), null);
  const videoHidden = !show.video || (stageTabbed && layout.stageTab !== 'video');

  const openQs = openQuestionCount(messages);
  const toggle = (p: ClassroomPanel) => setLayout((l) => togglePanel(l, p));

  return (
    <div className="fixed inset-0 z-40 bg-slate-900 flex flex-col">
      <div className="h-12 shrink-0 flex items-center gap-2 sm:gap-3 px-3 bg-[#1F4E79] text-white">
        <button onClick={leave} className="inline-flex items-center gap-1 text-sm font-semibold bg-white/10 hover:bg-white/20 rounded-md px-3 py-1.5">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
        </button>
        <div className="flex-1 min-w-0 truncate font-semibold text-sm">{cls?.title || 'Class'}</div>
        {cls && cls.status === 'Scheduled' && minsLeft > 0 && minsLeft < 600 && (
          <span className="hidden md:inline text-xs text-indigo-100 whitespace-nowrap">{minsLeft} min left</span>
        )}
        <VideoControls frame={frame} onShowVideo={() => setLayout((l) => revealPanel(l, 'video'))} />
        {hasClass && !isHost && (
          <span className="hidden sm:inline text-[11px] text-indigo-200 whitespace-nowrap" title="Your tutor arranges the windows">Layout by tutor</span>
        )}
        {hasClass && isHost && (
          <div className="flex items-center gap-1" role="group" aria-label="Show or hide windows">
            <PanelToggle panel="video" label="Video" on={layout.show.video} onToggle={toggle} Icon={Video} />
            <PanelToggle panel="whiteboard" label="Whiteboard" on={layout.show.whiteboard} onToggle={toggle} Icon={PenTool} />
            <PanelToggle panel="questions" label="Questions" on={layout.show.questions} onToggle={toggle} Icon={MessageSquare} badge={openQs} />
            <PanelToggle panel="learning" label="Learning" on={layout.show.learning} onToggle={toggle} Icon={BookOpen} />
            <button
              onClick={() => setLayout({ ...DEFAULT_LAYOUT, show: { ...DEFAULT_LAYOUT.show } })}
              title="Reset the layout" aria-label="Reset the layout"
              className="p-1.5 rounded-md hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {hasClass && videoHidden && pass && (
        <div className="shrink-0 text-[11px] text-center bg-slate-800 text-slate-300 py-0.5">
          Video window is hidden — you are still in the class and can hear everyone.
        </div>
      )}

      <div ref={mainRef} className={`flex-1 min-h-0 flex ${wide ? 'flex-row' : 'flex-col'}`}>
        {/* Left column: 1. Video + 4. Whiteboard */}
        <div ref={stageRef} style={stageStyle} className="min-w-0 min-h-0 flex flex-col">
          {stageTabbed && (
            <PairTabs
              tabs={[{ id: 'video', label: 'Video' }, { id: 'whiteboard', label: 'Whiteboard' }]}
              active={layout.stageTab}
              onSelect={(t) => setLayoutState((l) => ({ ...l, stageTab: t as 'video' | 'whiteboard' }))}
            />
          )}
          <div style={videoStyle} className="min-h-0 relative">
            <div className="absolute inset-0">{body}</div>
          </div>
          {bothStage && !stageTabbed && (
            <ResizeHandle
              disabled={!isHost}
              direction="column"
              containerRef={stageRef}
              ratio={layout.stageRatio}
              onChange={(r) => setLayout((l) => ({ ...l, stageRatio: r }))}
              onReset={() => setLayout((l) => ({ ...l, stageRatio: DEFAULT_LAYOUT.stageRatio }))}
              label="Resize the video and whiteboard windows"
            />
          )}
          {hasClass && (
            <div style={boardStyle} className="min-h-0 relative">
              <div className="absolute inset-0 overflow-hidden">
                {show.whiteboard && (
                  <Whiteboard
                    classId={cls!.id}
                    user={currentUser!}
                    isHost={isHost}
                    page={boardMeta.wbPage}
                    pageCount={boardMeta.wbPages}
                    onChangePage={changeBoardPage}
                    onAddPage={() => changeBoardPage(boardMeta.wbPages + 1, boardMeta.wbPages + 1)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {stageShown && sideShown && (
          <ResizeHandle
            disabled={!isHost}
            direction={wide ? 'row' : 'column'}
            containerRef={mainRef}
            ratio={layout.mainRatio}
            onChange={(r) => setLayout((l) => ({ ...l, mainRatio: r }))}
            onReset={() => setLayout((l) => ({ ...l, mainRatio: DEFAULT_LAYOUT.mainRatio }))}
            label="Resize the left and right windows"
          />
        )}

        {/* Right column: 3. Learning + 2. Questions */}
        {hasClass && (
          <div ref={sideRef} style={sideStyle} className="min-w-0 min-h-0 flex flex-col bg-white">
            {sideTabbed && (
              <PairTabs
                tabs={[{ id: 'learning', label: 'Learning' }, { id: 'questions', label: `Questions${openQs ? ` (${openQs})` : ''}` }]}
                active={layout.sideTab}
                onSelect={(t) => setLayoutState((l) => ({ ...l, sideTab: t as 'learning' | 'questions' }))}
              />
            )}
            <div style={learningStyle} className="min-h-0 relative">
              <div className="absolute inset-0 overflow-hidden">
                <LearningPanel
                  cls={cls}
                  focus={focus}
                  onShare={shareToBoard}
                  onTogglePresent={isHost ? togglePresent : undefined}
                  presenting={iAmPresenting}
                  onPresentView={onPresentView}
                  follow={following ? present : null}
                  onBrowseMyself={() => setSkippedPresentation(present?.startedAt || null)}
                  notFollowing={present && !iAmPresenting && !following ? present : null}
                  onFollow={() => setSkippedPresentation(null)}
                />
              </div>
            </div>
            {bothSide && !sideTabbed && (
              <ResizeHandle
                disabled={!isHost}
                direction="column"
                containerRef={sideRef}
                ratio={layout.sideRatio}
                onChange={(r) => setLayout((l) => ({ ...l, sideRatio: r }))}
                onReset={() => setLayout((l) => ({ ...l, sideRatio: DEFAULT_LAYOUT.sideRatio }))}
                label="Resize the learning and questions windows"
              />
            )}
            <div style={questionsStyle} className="min-h-0 relative">
              <div className="absolute inset-0 overflow-hidden">
                <QuestionsPanel
                  classId={cls!.id}
                  classTitle={cls!.title}
                  user={currentUser!}
                  isHost={isHost}
                  messages={messages}
                  boardError={boardError}
                  onOpenInLearning={openInLearning}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* v1.5: dictation for the class board, My notes and whiteboard text */}
      <DictationButton />

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

/** Two tabs that share one area on narrow screens. */
function PairTabs({ tabs, active, onSelect }: { tabs: { id: string; label: string }[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex shrink-0 bg-slate-100 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`flex-1 py-1.5 text-xs font-bold ${active === t.id ? 'bg-white text-indigo-700' : 'text-slate-500'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Header button that switches one window on or off. */
function PanelToggle({ panel, label, on, onToggle, Icon, badge }: {
  panel: ClassroomPanel; label: string; on: boolean; onToggle: (p: ClassroomPanel) => void;
  Icon: typeof Video; badge?: number;
}) {
  return (
    <button
      onClick={() => onToggle(panel)}
      aria-pressed={on}
      title={`${on ? 'Hide' : 'Show'} ${label}`}
      className={`relative inline-flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-1.5 border transition-colors
        ${on ? 'bg-white text-[#1F4E79] border-white' : 'bg-transparent text-indigo-100 border-white/30 hover:bg-white/10'}`}
    >
      <Icon className="h-4 w-4" /> <span className="hidden lg:inline">{label}</span>
      {!!badge && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[10px] leading-4 text-slate-900 font-bold">{badge}</span>
      )}
    </button>
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
