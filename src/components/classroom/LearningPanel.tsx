/**
 * LearningPanel (v1.5) — study notes, flashcards and quiz inside the class
 * room, filtered to the class's topics by default.
 *
 * Reads the existing data sets (dugu_study_notes, dugu_learning_items) —
 * read-only, nothing is changed. Practice results are not saved.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Layers, Target, Search, ExternalLink, ArrowLeft } from 'lucide-react';
import { STORE_KEYS } from '../../lib/storeKeys';
import { useStoredData } from '../../lib/useStoredData';
import type { OnlineClass } from '../../lib/classes';
import {
  ContentScope, SCOPE_LABELS, availableScopes, defaultScope, scopeFilter, matchesSearch, embeddableUrl,
} from '../../lib/classroomContent';
import type { SharedItem } from '../../lib/classChat';
import FlashcardDeck, { Empty } from './FlashcardDeck';
import QuizRunner from './QuizRunner';

export type LearningTab = 'notes' | 'flashcards' | 'quiz';

/** Asks the panel to open a particular item (from the class board). */
export interface LearningFocus { tab: LearningTab; itemId: string; nonce: number }

interface StudyNoteLike {
  id: string; title: string; type?: string; link: string;
  subjectId?: string; chapterId?: string; topicId?: string; topicName?: string; chapterName?: string;
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
}

const TABS: { id: LearningTab; label: string; Icon: typeof FileText }[] = [
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'flashcards', label: 'Flashcards', Icon: Layers },
  { id: 'quiz', label: 'Quiz', Icon: Target },
];

export default function LearningPanel({ cls, focus, onShare }: Props) {
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

  const counts: Record<LearningTab, number> = { notes: visibleNotes.length, flashcards: cards.length, quiz: questions.length };
  const scopes = availableScopes(cls);

  return (
    <div className="h-full flex flex-col bg-white">
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
          ? <NoteViewer note={openNote} onBack={() => setOpenNote(null)} onShare={onShare} />
          : <NotesList notes={visibleNotes} onOpen={setOpenNote} />)}
        {tab === 'flashcards' && (
          <FlashcardDeck
            cards={cards}
            focusId={focus?.tab === 'flashcards' ? focus.itemId : null}
            onShare={onShare && ((c) => onShare({ type: 'flashcard', itemId: c.id, title: c.front || 'Flashcard', front: c.front, back: c.back }))}
          />
        )}
        {tab === 'quiz' && (
          <QuizRunner
            questions={questions}
            focusId={focus?.tab === 'quiz' ? focus.itemId : null}
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

function NoteViewer({ note, onBack, onShare }: { note: StudyNoteLike; onBack: () => void; onShare?: (item: SharedItem) => void }) {
  const embed = embeddableUrl(note.link);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-200 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-1.5 py-1 rounded hover:bg-slate-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Notes
        </button>
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-800">{note.title}</span>
        {onShare && (
          <button onClick={() => onShare({ type: 'note', itemId: note.id, title: note.title, link: note.link })} className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-100" title="Put this note on the class board">
            Show to class
          </button>
        )}
        <a href={note.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-300 rounded px-2 py-1 hover:bg-slate-50">
          <ExternalLink className="h-3.5 w-3.5" /> New tab
        </a>
      </div>
      {embed ? (
        <iframe title={note.title} src={embed} className="flex-1 w-full border-0 bg-slate-50" allow="autoplay; fullscreen" />
      ) : (
        <Empty text="This link can't be shown inside the app (the site doesn't allow it). Use “New tab” — the class keeps running here." />
      )}
    </div>
  );
}
