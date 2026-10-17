/**
 * QuestionsPanel (v1.5) — the class room's writing space.
 *
 *  "Class board" — live and shared with everyone in the class:
 *     • Ask a question / post a comment (Enter sends, Shift+Enter = new line)
 *     • Reply under a message; tutor (or the asker) ticks a question "answered"
 *     • Items shown to the class from the Learning window: flashcards (tap to
 *       flip), quiz questions (everyone answers — the tutor sees the results),
 *       study notes (open in the Learning window)
 *     • The board stays with the class, so it can be reviewed afterwards.
 *  "My notes" — personal scratch notes for this class, saved automatically.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare, StickyNote, Send, CornerDownRight, CheckCircle2, Trash2, X, Download, Loader2,
  Layers, Target, FileText, Camera,
} from 'lucide-react';
import ScanCapture from '../scan/ScanCapture';
import ScanGallery from '../scan/ScanGallery';
import { deleteScanPages } from '../../lib/scans';
import type { AppUser } from '../../lib/AuthContext';
import {
  ClassMessage, MessageKind, SharedItem, MAX_MESSAGE_LENGTH, buildThreads, openQuestionCount, tallyResponses,
  listenToClassBoard, postMessage, setAnswered, deleteMessage, answerSharedQuiz, newMessageId, userKey,
  listenToMyNotes, saveMyNotes,
} from '../../lib/classChat';
import type { LearningTab } from './LearningPanel';

interface Props {
  classId: string;
  classTitle: string;
  user: AppUser;
  isHost: boolean;
  /** Messages are passed in by ClassRoom (it also uses them for the header badge). */
  messages: Record<string, ClassMessage>;
  boardError: string | null;
  onOpenInLearning: (tab: LearningTab, itemId: string) => void;
}

export default function QuestionsPanel(props: Props) {
  const [view, setView] = useState<'board' | 'mine'>('board');
  const open = openQuestionCount(props.messages);
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex border-b border-slate-200 shrink-0">
        <TabBtn active={view === 'board'} onClick={() => setView('board')}>
          <MessageSquare className="h-4 w-4" /> Class board
          {open > 0 && <span className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-1.5">{open} open</span>}
        </TabBtn>
        <TabBtn active={view === 'mine'} onClick={() => setView('mine')}>
          <StickyNote className="h-4 w-4" /> My notes
        </TabBtn>
      </div>
      <div className="flex-1 min-h-0">
        {view === 'board' ? <Board {...props} /> : <MyNotes classId={props.classId} classTitle={props.classTitle} email={props.user.email} />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold border-b-2 ${active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Class board
// ---------------------------------------------------------------------------

function Board({ classId, user, isHost, messages, boardError, onOpenInLearning }: Props) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'question' | 'comment'>('question');
  const [replyTo, setReplyTo] = useState<ClassMessage | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const threads = useMemo(() => buildThreads(messages), [messages]);
  const listRef = useRef<HTMLDivElement>(null);
  const count = Object.keys(messages).length;

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const send = async () => {
    const body = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!body) return;
    const msgKind: MessageKind = replyTo ? 'reply' : kind;
    const message: ClassMessage = {
      id: newMessageId(),
      kind: msgKind,
      text: body,
      authorEmail: user.email,
      authorName: user.username || user.email,
      authorRole: user.role,
      createdAt: new Date().toISOString(),
      replyTo: replyTo?.id,
    };
    setText('');
    setReplyTo(null);
    setSendError(null);
    try {
      await postMessage(classId, message);
    } catch (e) {
      console.warn(e);
      setText(body); // give the text back so nothing is lost
      setSendError('Could not send. Check the connection and try again.');
    }
  };

  /** v1.5: post scanned pages (e.g. a handwritten answer) to the board. */
  const sendScans = async (scanIds: string[], caption: string) => {
    const message: ClassMessage = {
      id: newMessageId(),
      kind: replyTo ? 'reply' : 'scan',
      text: caption.slice(0, MAX_MESSAGE_LENGTH),
      authorEmail: user.email,
      authorName: user.username || user.email,
      authorRole: user.role,
      createdAt: new Date().toISOString(),
      replyTo: replyTo?.id,
      scans: scanIds,
    };
    await postMessage(classId, message);
    setReplyTo(null);
    setScanning(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canModerate = (m: ClassMessage) => isHost || m.authorEmail === user.email;
  const act = (p: Promise<unknown>) => p.catch((e) => { console.warn(e); setSendError('That change could not be saved. Try again.'); });

  return (
    <div className="h-full flex flex-col">
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 bg-slate-50">
        {boardError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{boardError}</div>}
        {!boardError && threads.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-8 px-4">
            No questions yet. Type a question or comment below — everyone in the class sees it straight away.
          </div>
        )}
        {threads.map(({ message, replies }) => (
          <div key={message.id} className="space-y-1">
            <MessageCard
              m={message}
              me={user}
              isHost={isHost}
              canModerate={canModerate(message)}
              onReply={() => setReplyTo(message)}
              onToggleAnswered={() => act(setAnswered(classId, message.id, !message.answered, user.username || user.email))}
              onDelete={() => act(deleteMessage(classId, message.id).then(() => deleteScanPages(message.scans)))}
              onAnswerQuiz={(opt) => act(answerSharedQuiz(classId, message.id, user.email, user.username || user.email, opt))}
              onOpenInLearning={onOpenInLearning}
            />
            {replies.map((r) => (
              <div key={r.id} className="pl-5 flex gap-1">
                <CornerDownRight className="h-4 w-4 text-slate-300 shrink-0 mt-2" />
                <div className="flex-1">
                  <MessageCard
                    m={r} me={user} isHost={isHost} canModerate={canModerate(r)}
                    onDelete={() => act(deleteMessage(classId, r.id).then(() => deleteScanPages(r.scans)))}
                    onOpenInLearning={onOpenInLearning}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 p-2 shrink-0 space-y-1.5">
        {sendError && <div className="text-xs text-red-600">{sendError}</div>}
        {replyTo ? (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-indigo-50 rounded px-2 py-1">
            <CornerDownRight className="h-3.5 w-3.5" />
            <span className="flex-1 truncate">Replying to {replyTo.authorName}: “{replyTo.text || replyTo.share?.title}”</span>
            <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="p-0.5 hover:bg-indigo-100 rounded"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <div className="flex gap-1">
            {(['question', 'comment'] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border ${kind === k ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {k === 'question' ? '? Question' : 'Comment'}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            placeholder={replyTo ? 'Write a reply…' : kind === 'question' ? 'Ask a question…' : 'Write a comment…'}
            className="flex-1 resize-none text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex flex-col gap-1">
            {/* v1.5: scan a handwritten answer with the camera */}
            <button onClick={() => setScanning(true)} aria-label="Scan handwritten work" title="Scan handwritten work (camera)" className="border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg p-2">
              <Camera className="h-4 w-4" />
            </button>
            <button onClick={send} disabled={!text.trim()} aria-label="Send" className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg p-2">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        {scanning && (
          <ScanCapture
            user={user}
            title={replyTo ? 'Scan your answer' : 'Scan handwritten work'}
            subtitle={replyTo ? `Answer to: ${replyTo.text || replyTo.share?.title || ''}` : 'It appears on the class board straight away'}
            context={{ type: 'class', id: classId }}
            withCaption
            sendLabel="Send to class"
            onClose={() => setScanning(false)}
            onDone={sendScans}
          />
        )}
      </div>
    </div>
  );
}

interface CardProps {
  m: ClassMessage;
  me: AppUser;
  isHost: boolean;
  canModerate: boolean;
  onReply?: () => void;
  onToggleAnswered?: () => void;
  onDelete: () => void;
  onAnswerQuiz?: (option: number) => void;
  onOpenInLearning: (tab: LearningTab, itemId: string) => void;
}

function MessageCard({ m, me, isHost, canModerate, onReply, onToggleAnswered, onDelete, onAnswerQuiz, onOpenInLearning }: CardProps) {
  const mine = m.authorEmail === me.email;
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isQuestion = m.kind === 'question';
  const tone = isQuestion
    ? (m.answered ? 'border-emerald-200 bg-white' : 'border-amber-300 bg-amber-50')
    : m.kind === 'share' ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-lg border px-2.5 py-1.5 text-sm ${tone}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <span className={`font-semibold ${mine ? 'text-indigo-700' : 'text-slate-700'}`}>{mine ? 'You' : m.authorName}</span>
        {m.authorRole && m.authorRole !== 'Student' && <span className="bg-slate-200 text-slate-600 rounded px-1">{m.authorRole === 'Teacher' ? 'Tutor' : m.authorRole}</span>}
        <span>· {time}</span>
        {isQuestion && (m.answered
          ? <span className="ml-auto inline-flex items-center gap-0.5 text-emerald-700 font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Answered</span>
          : <span className="ml-auto text-amber-700 font-semibold">Question</span>)}
      </div>

      {m.text && <div className="mt-0.5 text-slate-800 whitespace-pre-wrap break-words">{m.text}</div>}
      {m.scans && m.scans.length > 0 && (
        <div className="mt-1">
          <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1 mb-1"><Camera className="h-3.5 w-3.5" /> Scanned work · {m.scans.length} page{m.scans.length === 1 ? '' : 's'} — tap to enlarge</div>
          <ScanGallery scanIds={m.scans} compact downloadName={`class-answer-${m.authorName}`} />
        </div>
      )}
      {m.share && <SharedItemView m={m} me={me} isHost={isHost} onAnswerQuiz={onAnswerQuiz} onOpenInLearning={onOpenInLearning} />}

      <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold">
        {onReply && <button onClick={onReply} className="text-indigo-600 hover:underline">Reply</button>}
        {isQuestion && onToggleAnswered && canModerate && (
          <button onClick={onToggleAnswered} className="text-emerald-700 hover:underline">{m.answered ? 'Mark not answered' : 'Mark answered'}</button>
        )}
        {canModerate && (
          <button onClick={onDelete} className="ml-auto text-slate-400 hover:text-red-600" aria-label="Delete message" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        )}
      </div>
    </div>
  );
}

function SharedItemView({ m, me, isHost, onAnswerQuiz, onOpenInLearning }: {
  m: ClassMessage; me: AppUser; isHost: boolean;
  onAnswerQuiz?: (option: number) => void;
  onOpenInLearning: (tab: LearningTab, itemId: string) => void;
}) {
  const s = m.share as SharedItem;
  const [flipped, setFlipped] = useState(false);

  if (s.type === 'flashcard') {
    return (
      <div className="mt-1">
        <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Flashcard</div>
        <button onClick={() => setFlipped((f) => !f)} className={`mt-1 w-full rounded-md border p-2 text-left ${flipped ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-indigo-200'}`}>
          <span className="block text-[10px] uppercase font-bold text-slate-400">{flipped ? 'Answer' : 'Question — tap to flip'}</span>
          <span className="block whitespace-pre-wrap break-words font-medium">{flipped ? s.back || '—' : s.front || '—'}</span>
        </button>
        <button onClick={() => onOpenInLearning('flashcards', s.itemId)} className="mt-1 text-[11px] text-indigo-600 hover:underline">Open in Learning</button>
      </div>
    );
  }

  if (s.type === 'quiz') {
    const mine = m.responses?.[userKey(me.email)];
    const tally = tallyResponses(m);
    const total = tally.reduce((a, b) => a + b, 0);
    const reveal = mine !== undefined || isHost; // tutor always sees the answer and results
    return (
      <div className="mt-1">
        <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Quiz for the class</div>
        <div className="font-medium mt-0.5 whitespace-pre-wrap break-words">{s.question}</div>
        <div className="mt-1 space-y-1">
          {(s.options || []).map((opt, i) => {
            const correct = i === s.correctOptionIndex;
            const picked = mine?.option === i;
            const style = !reveal ? 'bg-white border-slate-300 hover:border-indigo-400'
              : correct ? 'bg-emerald-50 border-emerald-400' : picked ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200';
            return (
              <button
                key={i}
                disabled={mine !== undefined || !onAnswerQuiz}
                onClick={() => onAnswerQuiz?.(i)}
                className={`w-full text-left text-xs rounded border px-2 py-1 flex gap-1.5 ${style}`}
              >
                <span className="font-bold text-slate-500">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1 break-words">{opt}</span>
                {isHost && <span className="text-slate-500 font-semibold">{tally[i]}</span>}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {mine !== undefined
            ? (mine.option === s.correctOptionIndex ? '✅ Correct!' : '❌ Not quite — the green one is right.')
            : isHost ? '' : 'Tap your answer.'}
          {isHost && ` ${total} answer${total === 1 ? '' : 's'}${total ? ': ' + Object.values(m.responses || {}).map((r) => `${r.name} ${String.fromCharCode(65 + r.option)}`).join(', ') : ''}`}
        </div>
      </div>
    );
  }

  // study note
  return (
    <div className="mt-1 flex items-center gap-2">
      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
      <span className="flex-1 min-w-0 truncate font-medium">{s.title}</span>
      <button onClick={() => onOpenInLearning('notes', s.itemId)} className="text-[11px] font-semibold text-indigo-600 hover:underline">Open</button>
      {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-slate-500 hover:underline">New tab</a>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// My notes — saved automatically 1.5 s after typing stops
// ---------------------------------------------------------------------------

function MyNotes({ classId, classTitle, email }: { classId: string; classTitle: string; email: string }) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef('');

  useEffect(() => {
    const unsub = listenToMyNotes(email, classId, (remote) => {
      // Don't overwrite what the user is typing right now.
      if (dirty.current) return;
      setText(remote || '');
      latest.current = remote || '';
      setState('saved');
    });
    return () => {
      unsub();
      // Save anything still pending when the panel closes.
      if (dirty.current) saveMyNotes(email, classId, latest.current).catch(() => {});
      if (timer.current) clearTimeout(timer.current);
    };
  }, [email, classId]);

  const onChange = (value: string) => {
    setText(value);
    latest.current = value;
    dirty.current = true;
    setState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveMyNotes(email, classId, latest.current);
        dirty.current = false;
        setState('saved');
      } catch (e) {
        console.warn(e);
        setState('error');
      }
    }, 1500);
  };

  const download = () => {
    const blob = new Blob([`${classTitle}\n\n${text}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classTitle.replace(/[^\w\- ]+/g, '').trim() || 'class'}-notes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="h-full flex flex-col p-2 gap-1.5">
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Only you see these notes. {state === 'saving' && <Loader2 className="inline h-3 w-3 animate-spin" />}
          {state === 'saved' && 'Saved.'}{state === 'error' && <span className="text-red-600"> Not saved — check the connection.</span>}
        </span>
        <button onClick={download} disabled={!text.trim()} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40">
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={state === 'loading'}
        placeholder={state === 'loading' ? 'Loading…' : 'Write your own notes for this class…'}
        className="flex-1 resize-none text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  );
}
