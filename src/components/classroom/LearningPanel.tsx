/**
 * LearningPanel (v1.5) — study notes, flashcards and quiz inside the class
 * room, filtered to the class's topics by default.
 *
 * Reads the existing data sets (dugu_study_notes, dugu_learning_items) —
 * read-only, nothing is changed. Practice results are not saved.
 *
 * Presenting (tutor/admin): "Present to class" makes every student's
 * Learning window show exactly what the tutor has open — the same note,
 * flashcard (and whether it is flipped) or quiz question (and whether the
 * answer is shown). Students see it in PresentedView and can choose
 * "Browse myself" / "Follow" at any time.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Layers, Target, Search, ExternalLink, ArrowLeft, Presentation, Square, Link as LinkIcon, BookmarkPlus } from 'lucide-react';
import { todayStr } from '../../lib/dates';
import { STORE_KEYS } from '../../lib/storeKeys';
import { useStoredData } from '../../lib/useStoredData';
import type { OnlineClass } from '../../lib/classes';
import {
  ContentScope, SCOPE_LABELS, availableScopes, defaultScope, scopeFilter, matchesSearch, embeddableUrl,
  normaliseLink, linkTitle,
} from '../../lib/classroomContent';
import type { SharedItem, PresentView, PresentState, MediaState } from '../../lib/classChat';
import { youTubeId } from '../../lib/youtube';
import YouTubePlayer from './YouTubePlayer';
import FlashcardDeck, { Empty } from './FlashcardDeck';
import QuizRunner from './QuizRunner';
import PresentedView from './PresentedView';

export type LearningTab = 'notes' | 'flashcards' | 'quiz';

/** Asks the panel to open a particular item (from the class board). */
export interface LearningFocus { tab: LearningTab; itemId: string; nonce: number }

interface StudyNoteLike {
  id: string; title: string; type?: string; link: string;
  subjectId?: string; chapterId?: string; topicId?: string; topicName?: string; chapterName?: string;
  /** v1.5: a link pasted in class (not a saved study note). */
  adhoc?: boolean;
}
interface LearningItemLike {
  id: string; type: 'flashcard' | 'quiz';
  subjectId?: string; chapterId?: string; topicId?: string; topicName?: string;
  front?: string; back?: string; question?: string; options?: string[]; correctOptionIndex?: number;
}

interface Props {
  cls: OnlineClass | undefined;
  focus: LearningFocus | null;
  /** Post an item to the class board (undefined = sharing not available). */
  onShare?: (item: SharedItem) => void;

  // ---- Presenting (v1.5) ----
  /** Tutor/admin only: start/stop presenting. Undefined = can't present. */
  onTogglePresent?: () => void;
  /** True while THIS user is presenting. */
  presenting?: boolean;
  /** Called with what is on screen while presenting. */
  onPresentView?: (view: PresentView) => void;
  /** Someone else is presenting and this user is following them. */
  follow?: PresentState | null;
  onBrowseMyself?: () => void;
  /** Someone else is presenting but this user chose to browse on their own. */
  notFollowing?: PresentState | null;
  onFollow?: () => void;
}

const TABS: { id: LearningTab; label: string; Icon: typeof FileText }[] = [
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'flashcards', label: 'Flashcards', Icon: Layers },
  { id: 'quiz', label: 'Quiz', Icon: Target },
];

export default function LearningPanel({
  cls, focus, onShare, onTogglePresent, presenting, onPresentView, follow, onBrowseMyself, notFollowing, onFollow,
}: Props) {
  const notes = useStoredData<StudyNoteLike[]>(STORE_KEYS.studyNotes, []);
  const items = useStoredData<LearningItemLike[]>(STORE_KEYS.learningItems, []);

  const [tab, setTab] = useState<LearningTab>('notes');
  const [scope, setScope] = useState<ContentScope>(() => defaultScope(cls));
  const [search, setSearch] = useState('');
  const [openNote, setOpenNote] = useState<StudyNoteLike | null>(null);

  // When the class data arrives (or changes), pick its natural scope.
  useEffect(() => { setScope(defaultScope(cls)); }, [cls?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inScope = useMemo(() => scopeFilter(cls, scope), [cls, scope]);
  const visibleNotes = useMemo(
    () => (Array.isArray(notes) ? notes : []).filter((n) => inScope(n) && matchesSearch(search, n.title, n.topicName, n.chapterName)),
    [notes, inScope, search],
  );
  const cards = useMemo(
    () => (Array.isArray(items) ? items : []).filter((i) => i.type === 'flashcard' && inScope(i) && matchesSearch(search, i.front, i.back, i.topicName)),
    [items, inScope, search],
  );
  const questions = useMemo(
    () => (Array.isArray(items) ? items : []).filter((i) => i.type === 'quiz' && inScope(i) && matchesSearch(search, i.question, i.topicName, ...(i.options || []))),
    [items, inScope, search],
  );

  // Open something requested from the class board — widen the scope if needed.
  useEffect(() => {
    if (!focus) return;
    setTab(focus.tab);
    setSearch('');
    if (focus.tab === 'notes') {
      const n = (notes || []).find((x) => x.id === focus.itemId);
      if (n) setOpenNote(n);
    } else {
      setOpenNote(null);
    }
    const all = focus.tab === 'notes' ? notes : items;
    const target = (all as any[] || []).find((x) => x.id === focus.itemId);
    if (target && !scopeFilter(cls, scope)(target)) setScope('all');
  }, [focus?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Presenting: work out what is on screen and report it --------------------
  type Shown = { item?: SharedItem; flag: boolean; label: string };
  const [deckView, setDeckView] = useState<Shown>({ flag: false, label: '' });
  const [quizView, setQuizView] = useState<Shown>({ flag: false, label: '' });
  /** Play/pause/position of a YouTube note (sent to followers while presenting). */
  const [media, setMedia] = useState<MediaState | undefined>(undefined);
  useEffect(() => { setMedia(undefined); }, [openNote?.id]);
  const reportRef = useRef(onPresentView);
  reportRef.current = onPresentView;
  const noteItem: SharedItem | undefined = openNote
    ? { type: 'note', itemId: openNote.id, title: openNote.title, link: openNote.link, adhoc: openNote.adhoc }
    : undefined;
  const shown: PresentView =
    tab === 'notes' ? { tab, item: noteItem, label: openNote ? '' : 'Notes list', media: openNote ? media : undefined }
    : tab === 'flashcards' ? { tab, item: deckView.item, flipped: deckView.flag, label: deckView.label }
    : { tab, item: quizView.item, revealed: quizView.flag, label: quizView.label };
  const shownKey = JSON.stringify(shown);
  useEffect(() => {
    if (presenting) reportRef.current?.(shown);
  }, [presenting, shownKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // v1.5: tutor/admin can keep a pasted link as a study note for this class's chapter.
  const canSaveLink = !!onTogglePresent && !!cls?.subjectId && !!cls?.chapterId;
  const saveLinkAsNote = (note: StudyNoteLike) => {
    if (!cls?.subjectId || !cls.chapterId) return false;
    let list: any[] = [];
    try { list = JSON.parse(localStorage.getItem(STORE_KEYS.studyNotes) || '[]'); } catch { list = []; }
    if (!Array.isArray(list)) list = [];
    if (list.some((n) => n.link === note.link && n.chapterId === cls.chapterId)) return true; // already saved
    const topic = (cls.plannedTopics || [])[0];
    list.unshift({
      id: Date.now().toString(),
      subjectId: cls.subjectId, subjectName: cls.subjectName || '',
      chapterId: cls.chapterId, chapterName: cls.chapterName || '',
      topicId: topic?.topicId || '', topicName: topic?.name || '',
      title: `${topic?.name || cls.chapterName || note.title} – ${note.title}`,
      type: 'Link', link: note.link, dateAdded: todayStr(),
    });
    localStorage.setItem(STORE_KEYS.studyNotes, JSON.stringify(list)); // synced like any study note
    return true;
  };

  const counts: Record<LearningTab, number> = { notes: visibleNotes.length, flashcards: cards.length, quiz: questions.length };
  const scopes = availableScopes(cls);

  return (
    <div className="relative h-full flex flex-col bg-white">
      {/* Following the tutor: their view covers this window (own browsing is kept underneath) */}
      {follow && onBrowseMyself && (
        <div className="absolute inset-0 z-10">
          <PresentedView present={follow} onBrowseMyself={onBrowseMyself} />
        </div>
      )}

      {/* Presenting controls (tutor/admin) / "Follow" for a student browsing alone */}
      {onTogglePresent && (
        <div className={`shrink-0 flex items-center gap-2 px-2 py-1 text-xs border-b ${presenting ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <span className="flex-1 min-w-0 truncate">
            {presenting ? '● Presenting — the class sees what you open here' : 'Show the class exactly what you open here'}
          </span>
          <button
            onClick={onTogglePresent}
            className={`inline-flex items-center gap-1 font-semibold rounded px-2 py-1 shrink-0 ${presenting ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {presenting ? <><Square className="h-3.5 w-3.5" /> Stop presenting</> : <><Presentation className="h-3.5 w-3.5" /> Present to class</>}
          </button>
        </div>
      )}
      {notFollowing && onFollow && (
        <div className="shrink-0 flex items-center gap-2 px-2 py-1 text-xs bg-indigo-50 border-b border-indigo-200 text-indigo-800">
          <span className="flex-1 min-w-0 truncate"><strong>{notFollowing.byName}</strong> is presenting</span>
          <button onClick={onFollow} className="font-semibold bg-indigo-600 text-white rounded px-2 py-1 shrink-0">Follow</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id !== 'notes') setOpenNote(null); }}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold border-b-2 ${tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5">{counts[id]}</span>
          </button>
        ))}
      </div>

      {/* Scope + search */}
      {!openNote && (
        <div className="flex gap-2 p-2 border-b border-slate-100 shrink-0">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ContentScope)}
            className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white"
            aria-label="Show content for"
          >
            {scopes.map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
          </select>
          <div className="flex-1 relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full text-xs border border-slate-300 rounded-md pl-7 pr-2 py-1"
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'notes' && (openNote
          ? <NoteViewer note={openNote} onBack={() => setOpenNote(null)} onShare={onShare} presenting={!!presenting} onMedia={setMedia} onSaveLink={canSaveLink ? saveLinkAsNote : undefined} />
          : (
            <div className="h-full flex flex-col">
              {/* v1.5: open (and present) any web / YouTube / Google Drive link */}
              <LinkBar onOpen={(url) => setOpenNote({ id: `link-${Date.now()}`, title: linkTitle(url), link: url, type: 'Link', adhoc: true })} />
              <div className="flex-1 min-h-0"><NotesList notes={visibleNotes} onOpen={setOpenNote} /></div>
            </div>
          ))}
        {tab === 'flashcards' && (
          <FlashcardDeck
            cards={cards}
            focusId={focus?.tab === 'flashcards' ? focus.itemId : null}
            onViewChange={(c, flipped, label) => setDeckView({
              item: c ? { type: 'flashcard', itemId: c.id, title: c.front || 'Flashcard', front: c.front, back: c.back } : undefined,
              flag: flipped, label,
            })}
            onShare={onShare && ((c) => onShare({ type: 'flashcard', itemId: c.id, title: c.front || 'Flashcard', front: c.front, back: c.back }))}
          />
        )}
        {tab === 'quiz' && (
          <QuizRunner
            questions={questions}
            focusId={focus?.tab === 'quiz' ? focus.itemId : null}
            onViewChange={(q, revealed, label) => setQuizView({
              item: q ? { type: 'quiz', itemId: q.id, title: q.question || 'Quiz question', question: q.question, options: q.options, correctOptionIndex: q.correctOptionIndex } : undefined,
              flag: revealed, label,
            })}
            onShare={onShare && ((q) => onShare({ type: 'quiz', itemId: q.id, title: q.question || 'Quiz question', question: q.question, options: q.options, correctOptionIndex: q.correctOptionIndex }))}
          />
        )}
      </div>
    </div>
  );
}

function NotesList({ notes, onOpen }: { notes: StudyNoteLike[]; onOpen: (n: StudyNoteLike) => void }) {
  if (!notes.length) return <Empty text="No study notes here yet. Try a wider scope, or add notes on the Study Notes page." />;
  return (
    <ul className="h-full overflow-y-auto divide-y divide-slate-100">
      {notes.map((n) => (
        <li key={n.id}>
          <button onClick={() => onOpen(n)} className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-slate-800 truncate">{n.title}</span>
              <span className="block text-[11px] text-slate-500 truncate">{[n.type, n.chapterName, n.topicName].filter(Boolean).join(' · ')}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function NoteViewer({ note, onBack, onShare, presenting, onMedia, onSaveLink }: {
  note: StudyNoteLike; onBack: () => void; onShare?: (item: SharedItem) => void;
  presenting: boolean; onMedia: (m: MediaState) => void;
  onSaveLink?: (note: StudyNoteLike) => boolean;
}) {
  const embed = embeddableUrl(note.link, { anyWebsite: note.adhoc });
  const knownSite = !!embeddableUrl(note.link);
  const ytId = youTubeId(note.link);
  const [saved, setSaved] = useState(false);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-200 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-1.5 py-1 rounded hover:bg-slate-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Notes
        </button>
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-800">{note.title}</span>
        {onShare && (
          <button onClick={() => onShare({ type: 'note', itemId: note.id, title: note.title, link: note.link, adhoc: note.adhoc })} className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-100" title="Put this note on the class board">
            Show to class
          </button>
        )}
        {note.adhoc && onSaveLink && (
          <button
            onClick={() => setSaved(onSaveLink(note))}
            disabled={saved}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded px-2 py-1 hover:bg-emerald-100 disabled:opacity-60"
            title="Keep this link in Study Notes for this chapter"
          >
            <BookmarkPlus className="h-3.5 w-3.5" /> {saved ? 'Saved' : 'Save to notes'}
          </button>
        )}
        <a href={note.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-300 rounded px-2 py-1 hover:bg-slate-50">
          <ExternalLink className="h-3.5 w-3.5" /> New tab
        </a>
      </div>
      {note.adhoc && !ytId && !knownSite && (
        <div className="shrink-0 text-[11px] px-2 py-1 bg-slate-50 text-slate-600 border-b border-slate-200">
          If this stays blank, the website doesn't allow being shown inside other apps — use <strong>New tab</strong>, or <strong>Share screen</strong> to show it to the class.
        </div>
      )}
      {presenting && !ytId && embed && (
        <div className="shrink-0 text-[11px] px-2 py-1 bg-amber-50 text-amber-800 border-b border-amber-200">
          The class sees this file, but scrolling and page turns inside it can't be copied to their screen.
          To show them exactly, use <strong>Share screen</strong> at the top (choose this tab).
        </div>
      )}
      {ytId ? (
        <div className="flex-1 min-h-0">
          {/* While presenting, play/pause/position are copied to the class; each device plays the sound itself. */}
          <YouTubePlayer videoId={ytId} title={note.title} onMedia={onMedia} />
        </div>
      ) : embed ? (
        <iframe title={note.title} src={embed} className="flex-1 w-full border-0 bg-slate-50" allow="autoplay; fullscreen" />
      ) : (
        <Empty text="This link can't be shown inside the app (the site doesn't allow it). Use “New tab” — the class keeps running here." />
      )}
    </div>
  );
}

/** v1.5: paste a link (website, YouTube, Google Drive…) and open it here — and present it. */
function LinkBar({ onOpen }: { onOpen: (url: string) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const open = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normaliseLink(text);
    if (!url) { setError(true); return; }
    setError(false);
    setText('');
    onOpen(url);
  };
  return (
    <form onSubmit={open} className="shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-slate-100 bg-indigo-50/40">
      <LinkIcon className="h-4 w-4 text-indigo-500 shrink-0" />
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); setError(false); }}
        placeholder="Paste a link to open / present (website, YouTube, Google Drive…)"
        className={`flex-1 min-w-0 text-xs border rounded-md px-2 py-1.5 ${error ? 'border-red-400' : 'border-slate-300'}`}
        aria-label="Link to open"
        inputMode="url"
      />
      <button type="submit" disabled={!text.trim()} className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-md px-3 py-1.5">Open</button>
    </form>
  );
}
