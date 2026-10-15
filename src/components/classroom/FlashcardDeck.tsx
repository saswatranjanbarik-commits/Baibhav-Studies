/**
 * FlashcardDeck (v1.5) — flip-through practice inside the class room.
 * Tap the card to flip it. Optional "Show to class" puts the card on the
 * class board so everyone sees it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw, Send } from 'lucide-react';

export interface DeckCard { id: string; front?: string; back?: string; topicName?: string }

interface Props {
  cards: DeckCard[];
  /** Start on this card (e.g. opened from the class board). */
  focusId?: string | null;
  onShare?: (card: DeckCard) => void;
}

export default function FlashcardDeck({ cards, focusId, onShare }: Props) {
  const [order, setOrder] = useState<string[]>(() => cards.map((c) => c.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Start over whenever the set of cards changes (scope/search changed).
  const idsKey = cards.map((c) => c.id).join(',');
  useEffect(() => {
    setOrder(cards.map((c) => c.id));
    setIndex(0);
    setFlipped(false);
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusId) return;
    const i = order.indexOf(focusId);
    if (i >= 0) { setIndex(i); setFlipped(false); }
  }, [focusId, order]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const card = byId.get(order[index]);

  if (!cards.length) {
    return <Empty text="No flashcards here yet. Try a wider scope, or add cards on the Flashcards page." />;
  }
  if (!card) return null;

  const go = (d: number) => { setIndex((i) => (i + d + order.length) % order.length); setFlipped(false); };
  const shuffle = () => {
    const a = [...order];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    setOrder(a); setIndex(0); setFlipped(false);
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Card {index + 1} of {order.length}{card.topicName ? ` · ${card.topicName}` : ''}</span>
        <div className="flex gap-1">
          <IconBtn onClick={shuffle} title="Shuffle"><Shuffle className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={() => { setOrder(cards.map((c) => c.id)); setIndex(0); setFlipped(false); }} title="Restart"><RotateCcw className="h-4 w-4" /></IconBtn>
          {onShare && (
            <button onClick={() => onShare(card)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-100" title="Put this card on the class board">
              <Send className="h-3.5 w-3.5" /> Show to class
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className={`flex-1 min-h-[140px] rounded-xl border-2 p-4 flex flex-col items-center justify-center text-center transition-colors
          ${flipped ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-indigo-200 hover:border-indigo-400'}`}
      >
        <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${flipped ? 'text-emerald-600' : 'text-indigo-500'}`}>
          {flipped ? 'Answer' : 'Question'}
        </span>
        <span className="text-base sm:text-lg font-semibold text-slate-800 whitespace-pre-wrap break-words">
          {flipped ? card.back || '—' : card.front || '—'}
        </span>
        <span className="text-[11px] text-slate-400 mt-3">Tap to {flipped ? 'see the question' : 'reveal the answer'}</span>
      </button>

      <div className="flex items-center justify-between">
        <button onClick={() => go(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button onClick={() => go(1)} className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-indigo-600 rounded-lg px-3 py-1.5 hover:bg-indigo-700">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
      {children}
    </button>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center text-center text-sm text-slate-500 p-6">{text}</div>;
}
