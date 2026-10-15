/**
 * QuizRunner (v1.5) — answer quiz questions one at a time inside the class
 * room, with instant feedback and a score. Practice only: nothing is saved.
 * Optional "Ask the class" puts the question on the class board as a live
 * poll that everyone can answer.
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Send, CheckCircle2, XCircle } from 'lucide-react';
import { Empty } from './FlashcardDeck';

export interface QuizQuestion { id: string; question?: string; options?: string[]; correctOptionIndex?: number; topicName?: string }

interface Props {
  questions: QuizQuestion[];
  focusId?: string | null;
  onShare?: (q: QuizQuestion) => void;
}

export default function QuizRunner({ questions, focusId, onShare }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const idsKey = questions.map((q) => q.id).join(',');
  useEffect(() => { setIndex(0); setAnswers({}); }, [idsKey]);
  useEffect(() => {
    if (!focusId) return;
    const i = questions.findIndex((q) => q.id === focusId);
    if (i >= 0) setIndex(i);
  }, [focusId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions.length) {
    return <Empty text="No quiz questions here yet. Try a wider scope, or add questions on the Flashcards page." />;
  }
  const q = questions[Math.min(index, questions.length - 1)];
  const chosen = answers[q.id];
  const answeredCount = Object.keys(answers).length;
  const score = questions.filter((x) => answers[x.id] !== undefined && answers[x.id] === x.correctOptionIndex).length;

  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-y-auto">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Question {index + 1} of {questions.length}{q.topicName ? ` · ${q.topicName}` : ''}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Score {score}/{answeredCount}</span>
          <button onClick={() => { setAnswers({}); setIndex(0); }} title="Start again" aria-label="Start again" className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
            <RotateCcw className="h-4 w-4" />
          </button>
          {onShare && (
            <button onClick={() => onShare(q)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-100" title="Post this question on the class board for everyone to answer">
              <Send className="h-3.5 w-3.5" /> Ask the class
            </button>
          )}
        </div>
      </div>

      <div className="font-semibold text-slate-800 whitespace-pre-wrap break-words">{q.question || '—'}</div>

      <div className="space-y-2">
        {(q.options || []).map((opt, i) => {
          const isCorrect = i === q.correctOptionIndex;
          const picked = chosen === i;
          const style = chosen === undefined
            ? 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
            : isCorrect ? 'border-emerald-400 bg-emerald-50'
            : picked ? 'border-red-400 bg-red-50' : 'border-slate-200 opacity-70';
          return (
            <button
              key={i}
              disabled={chosen !== undefined}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
              className={`w-full text-left text-sm rounded-lg border px-3 py-2 flex items-start gap-2 ${style}`}
            >
              <span className="font-bold text-slate-500">{String.fromCharCode(65 + i)}.</span>
              <span className="flex-1 break-words">{opt}</span>
              {chosen !== undefined && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {picked && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        {index < questions.length - 1 ? (
          <button onClick={() => setIndex((i) => i + 1)} className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-indigo-600 rounded-lg px-3 py-1.5 hover:bg-indigo-700">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-sm font-semibold text-slate-700">
            {answeredCount === questions.length ? `Done — ${score}/${questions.length}` : `${questions.length - answeredCount} unanswered`}
          </span>
        )}
      </div>
    </div>
  );
}
