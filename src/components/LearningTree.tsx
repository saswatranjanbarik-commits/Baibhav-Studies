/**
 * LearningTree — shows flashcards & quizzes grouped by Subject → Chapter → Topic.
 *
 * mode="manage"   (Admin/Teacher): add cards/quizzes to a topic, see and delete items.
 * mode="practice" (everyone):      start flashcard practice or a quiz for any
 *                                  subject, chapter or single topic.
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Play, BookOpen, FolderOpen, Hash } from 'lucide-react';
import type { SubjectNode, Counts, LearningItemLike } from '../lib/learningTree';

export interface SessionFilter { subjectId?: string; chapterId?: string; topicId?: string }

interface Item extends LearningItemLike { front?: string; question?: string }

interface Props<T extends Item> {
  tree: SubjectNode<T>[];
  mode: 'manage' | 'practice';
  /** In practice mode: which kind of session the buttons start. */
  practiceType?: 'flashcard' | 'quiz';
  /** Expand everything (e.g. while searching). */
  expandAll?: boolean;
  /** Node to open on first render, e.g. from a Syllabus link. */
  initiallyOpen?: SessionFilter;
  onAdd?: (type: 'flashcard' | 'quiz', path: Required<SessionFilter>) => void;
  onDelete?: (id: string) => void;
  onStart: (type: 'flashcard' | 'quiz', filter: SessionFilter) => void;
}

function CountBadges({ c }: { c: Counts }) {
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 border ${c.flashcards ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
        {c.flashcards} card{c.flashcards === 1 ? '' : 's'}
      </span>
      <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 border ${c.quizzes ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
        {c.quizzes} quiz
      </span>
    </span>
  );
}

export default function LearningTree<T extends Item>({
  tree, mode, practiceType, expandAll, initiallyOpen, onAdd, onDelete, onStart,
}: Props<T>) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Open the branch requested by a link (e.g. from the Syllabus page).
  useEffect(() => {
    if (!initiallyOpen?.subjectId) return;
    const next = new Set<string>([`s:${initiallyOpen.subjectId}`]);
    if (initiallyOpen.chapterId) next.add(`c:${initiallyOpen.subjectId}:${initiallyOpen.chapterId}`);
    if (initiallyOpen.topicId) next.add(`t:${initiallyOpen.subjectId}:${initiallyOpen.chapterId}:${initiallyOpen.topicId}`);
    setOpen(next);
  }, [initiallyOpen?.subjectId, initiallyOpen?.chapterId, initiallyOpen?.topicId]);

  const isOpen = (key: string) => expandAll || open.has(key);
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  /** Practice buttons for a node (only shown when there is something to practise). */
  const StartButtons = ({ c, filter }: { c: Counts; filter: SessionFilter }) => {
    const types: ('flashcard' | 'quiz')[] = mode === 'practice' && practiceType ? [practiceType] : ['flashcard', 'quiz'];
    return (
      <span className="flex items-center gap-1 shrink-0">
        {types.map((type) => {
          const n = type === 'flashcard' ? c.flashcards : c.quizzes;
          if (!n) return null;
          return (
            <button
              key={type}
              onClick={(e) => { e.stopPropagation(); onStart(type, filter); }}
              title={type === 'flashcard' ? `Practise ${n} flashcards` : `Take a ${n}-question quiz`}
              className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2 py-1 border ${type === 'flashcard' ? 'text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50' : 'text-red-700 bg-white border-red-200 hover:bg-red-50'}`}
            >
              <Play className="h-3 w-3" /> {type === 'flashcard' ? 'Practice' : 'Quiz'}
            </button>
          );
        })}
      </span>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="py-10 text-center text-slate-500 text-sm">
        {mode === 'manage' ? 'No subjects in the syllabus yet. Add them on the Syllabus page first.' : 'Nothing to practise yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tree.map((s) => {
        const sKey = `s:${s.id}`;
        return (
          <div key={sKey} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            {/* Subject */}
            <div
              role="button"
              onClick={() => toggle(sKey)}
              className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              {isOpen(sKey) ? <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />}
              <BookOpen className="h-4 w-4 text-green-600 shrink-0" />
              <span className="font-bold text-slate-900 flex-1 min-w-0 truncate">{s.name}</span>
              <span className="hidden sm:flex"><CountBadges c={s} /></span>
              <StartButtons c={s} filter={{ subjectId: s.id }} />
            </div>

            {isOpen(sKey) && (
              <div className="divide-y divide-slate-100">
                {s.chapters.length === 0 && <div className="px-9 py-2 text-xs text-slate-400">No chapters</div>}
                {s.chapters.map((c) => {
                  const cKey = `c:${s.id}:${c.id}`;
                  return (
                    <div key={cKey}>
                      {/* Chapter */}
                      <div
                        role="button"
                        onClick={() => toggle(cKey)}
                        className="flex items-center gap-2 pl-7 pr-3 py-2 hover:bg-slate-50 cursor-pointer"
                      >
                        {isOpen(cKey) ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                        <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="font-semibold text-slate-800 text-sm flex-1 min-w-0 truncate">{c.name}</span>
                        <span className="hidden sm:flex"><CountBadges c={c} /></span>
                        <StartButtons c={c} filter={{ subjectId: s.id, chapterId: c.id }} />
                      </div>

                      {isOpen(cKey) && (
                        <div className="pb-1">
                          {c.topics.length === 0 && <div className="pl-16 py-1.5 text-xs text-slate-400">No topics</div>}
                          {c.topics.map((t) => {
                            const tKey = `t:${s.id}:${c.id}:${t.id}`;
                            const path = { subjectId: s.id, chapterId: c.id, topicId: t.id };
                            const canExpand = mode === 'manage' && t.items.length > 0;
                            return (
                              <div key={tKey}>
                                {/* Topic */}
                                <div
                                  role={canExpand ? 'button' : undefined}
                                  onClick={() => canExpand && toggle(tKey)}
                                  className={`flex items-center gap-2 pl-14 pr-3 py-1.5 ${canExpand ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                                >
                                  {canExpand
                                    ? (isOpen(tKey) ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />)
                                    : <Hash className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                                  <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{t.name}</span>
                                  <CountBadges c={t} />
                                  {mode === 'manage' && onAdd && (
                                    <span className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onAdd('flashcard', path); }}
                                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded px-1.5 py-1"
                                        title="Add a flashcard to this topic"
                                      >
                                        <Plus className="h-3 w-3" /> Card
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onAdd('quiz', path); }}
                                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 rounded px-1.5 py-1"
                                        title="Add a quiz question to this topic"
                                      >
                                        <Plus className="h-3 w-3" /> Quiz
                                      </button>
                                    </span>
                                  )}
                                  <StartButtons c={t} filter={path} />
                                </div>

                                {/* Items in the topic (manage mode) */}
                                {canExpand && isOpen(tKey) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-14 pr-3 pb-3 pt-1">
                                    {t.items.map((item) => (
                                      <div key={item.id} className="group relative border border-slate-200 rounded-lg p-2.5 bg-white text-sm">
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border mb-1 ${item.type === 'flashcard' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                          {item.type}
                                        </span>
                                        <div className="text-slate-700 line-clamp-2 pr-6">{item.type === 'flashcard' ? item.front : item.question}</div>
                                        {onDelete && (
                                          <button
                                            onClick={() => onDelete(item.id)}
                                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded sm:opacity-0 sm:group-hover:opacity-100"
                                            aria-label="Delete"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
