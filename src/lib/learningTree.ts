/**
 * Groups flashcards & quiz questions under Subject → Chapter → Topic,
 * following the order of the Syllabus.
 *
 * Items whose subject/chapter/topic no longer exists in the syllabus are NOT
 * hidden — they appear under their saved names, at the end, so nothing is lost.
 */

export interface LearningItemLike {
  id: string;
  type: 'flashcard' | 'quiz';
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
}

export interface Counts { flashcards: number; quizzes: number }

export interface TopicNode<T> extends Counts { id: string; name: string; items: T[] }
export interface ChapterNode<T> extends Counts { id: string; name: string; topics: TopicNode<T>[] }
export interface SubjectNode<T> extends Counts { id: string; name: string; chapters: ChapterNode<T>[] }

interface Options {
  /** Include syllabus topics that have no items yet (useful when adding content). */
  includeEmpty: boolean;
}

const k = (v: unknown) => (v === undefined || v === null ? '' : String(v));

export function buildLearningTree<T extends LearningItemLike>(
  syllabus: any[],
  items: T[],
  { includeEmpty }: Options,
): SubjectNode<T>[] {
  const subjects: SubjectNode<T>[] = [];
  const zero = (): Counts => ({ flashcards: 0, quizzes: 0 });

  const getSubject = (id: string, name: string) => {
    let s = subjects.find((x) => x.id === id);
    if (!s) { s = { id, name: name || 'Unnamed subject', chapters: [], ...zero() }; subjects.push(s); }
    return s;
  };
  const getChapter = (s: SubjectNode<T>, id: string, name: string) => {
    let c = s.chapters.find((x) => x.id === id);
    if (!c) { c = { id, name: name || 'Unnamed chapter', topics: [], ...zero() }; s.chapters.push(c); }
    return c;
  };
  const getTopic = (c: ChapterNode<T>, id: string, name: string) => {
    let t = c.topics.find((x) => x.id === id);
    if (!t) { t = { id, name: name || 'Unnamed topic', items: [], ...zero() }; c.topics.push(t); }
    return t;
  };

  // 1. Lay out the syllabus structure first, so the order matches the Syllabus page.
  for (const sub of syllabus || []) {
    const s = getSubject(k(sub.id), sub.name);
    for (const ch of sub.chapters || []) {
      const c = getChapter(s, k(ch.id), ch.name);
      for (const tp of ch.topics || []) getTopic(c, k(tp.id), tp.name);
    }
  }

  // 2. Put every item in its place (creating nodes for anything not in the syllabus).
  for (const item of items) {
    const s = getSubject(k(item.subjectId), item.subjectName);
    const c = getChapter(s, k(item.chapterId), item.chapterName);
    const t = getTopic(c, k(item.topicId), item.topicName);
    t.items.push(item);
  }

  // 3. Count, and drop empty branches if requested.
  for (const s of subjects) {
    for (const c of s.chapters) {
      for (const t of c.topics) {
        t.flashcards = t.items.filter((i) => i.type === 'flashcard').length;
        t.quizzes = t.items.filter((i) => i.type === 'quiz').length;
      }
      if (!includeEmpty) c.topics = c.topics.filter((t) => t.items.length > 0);
      c.flashcards = c.topics.reduce((n, t) => n + t.flashcards, 0);
      c.quizzes = c.topics.reduce((n, t) => n + t.quizzes, 0);
    }
    if (!includeEmpty) s.chapters = s.chapters.filter((c) => c.flashcards + c.quizzes > 0);
    s.flashcards = s.chapters.reduce((n, c) => n + c.flashcards, 0);
    s.quizzes = s.chapters.reduce((n, c) => n + c.quizzes, 0);
  }
  return includeEmpty ? subjects : subjects.filter((s) => s.flashcards + s.quizzes > 0);
}
