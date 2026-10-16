/**
 * PresentedView (v1.5) — what a student sees in the Learning window while the
 * tutor presents: exactly the note, flashcard (front or back) or quiz
 * question the tutor has on screen. The tutor controls it; the student can
 * still tap a quiz answer for themselves until the tutor reveals it.
 */
import React, { useState } from 'react';
import { ExternalLink, Presentation, CheckCircle2, XCircle } from 'lucide-react';
import type { PresentState } from '../../lib/classChat';
import { embeddableUrl } from '../../lib/classroomContent';
import { Empty } from './FlashcardDeck';

interface Props {
  present: PresentState;
  /** Leave the presentation and browse on your own. */
  onBrowseMyself: () => void;
}

const TAB_NAMES = { notes: 'Notes', flashcards: 'Flashcards', quiz: 'Quiz' } as const;

export default function PresentedView({ present, onBrowseMyself }: Props) {
  const { item } = present;
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs">
        <Presentation className="h-4 w-4 shrink-0" />
        <span className="flex-1 min-w-0 truncate">
          <strong>{present.byName}</strong> is presenting · {TAB_NAMES[present.tab]}{present.label ? ` · ${present.label}` : ''}
        </span>
        <button onClick={onBrowseMyself} className="shrink-0 font-semibold bg-white/15 hover:bg-white/25 rounded px-2 py-0.5">
          Browse myself
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {!item ? (
          <Empty text={`${present.byName} is choosing what to show…`} />
        ) : item.type === 'note' ? (
          <NoteView title={item.title} link={item.link} />
        ) : item.type === 'flashcard' ? (
          <CardView front={item.front} back={item.back} flipped={!!present.flipped} />
        ) : (
          // key: a fresh answer for every new question
          <QuizView key={item.itemId} question={item.question} options={item.options} correct={item.correctOptionIndex} revealed={!!present.revealed} />
        )}
      </div>
    </div>
  );
}

function NoteView({ title, link }: { title: string; link?: string }) {
  const embed = embeddableUrl(link);
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-slate-200">
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-800">{title}</span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-300 rounded px-2 py-1 hover:bg-slate-50">
            <ExternalLink className="h-3.5 w-3.5" /> New tab
          </a>
        )}
      </div>
      {embed ? (
        <iframe title={title} src={embed} className="flex-1 w-full border-0 bg-slate-50" allow="autoplay; fullscreen" />
      ) : (
        <Empty text="This note can't be shown inside the app. Open it in a new tab, or ask your tutor to share their screen." />
      )}
    </div>
  );
}

function CardView({ front, back, flipped }: { front?: string; back?: string; flipped: boolean }) {
  return (
    <div className="h-full p-3 flex">
      <div className={`flex-1 rounded-xl border-2 p-4 flex flex-col items-center justify-center text-center ${flipped ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-indigo-200'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${flipped ? 'text-emerald-600' : 'text-indigo-500'}`}>{flipped ? 'Answer' : 'Question'}</span>
        <span className="text-base sm:text-lg font-semibold text-slate-800 whitespace-pre-wrap break-words">{(flipped ? back : front) || '—'}</span>
      </div>
    </div>
  );
}

function QuizView({ question, options, correct, revealed }: { question?: string; options?: string[]; correct?: number; revealed: boolean }) {
  const [mine, setMine] = useState<number | null>(null);
  const showResult = revealed || mine !== null;
  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      <div className="font-semibold text-slate-800 whitespace-pre-wrap break-words">{question || '—'}</div>
      <div className="space-y-2">
        {(options || []).map((opt, i) => {
          const isCorrect = i === correct;
          const picked = mine === i;
          const style = !showResult ? 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
            : revealed && isCorrect ? 'border-emerald-400 bg-emerald-50'
            : picked ? (revealed ? 'border-red-400 bg-red-50' : 'border-indigo-400 bg-indigo-50')
            : 'border-slate-200';
          return (
            <button key={i} disabled={mine !== null || revealed} onClick={() => setMine(i)} className={`w-full text-left text-sm rounded-lg border px-3 py-2 flex items-start gap-2 ${style}`}>
              <span className="font-bold text-slate-500">{String.fromCharCode(65 + i)}.</span>
              <span className="flex-1 break-words">{opt}</span>
              {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {revealed && picked && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-500">
        {revealed
          ? mine === null ? 'The tutor has shown the answer.' : mine === correct ? '✅ Correct!' : '❌ Not quite — the green one is right.'
          : mine === null ? 'Tap your answer. Your tutor will show the right one.' : 'Answer chosen — wait for your tutor to show the right one.'}
      </div>
    </div>
  );
}
