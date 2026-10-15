/**
 * Which study notes, flashcards and quiz questions to show in the class
 * room's Learning window (v1.5). Pure functions — unit-tested.
 *
 * Scopes:
 *   class   → the topics planned for this class (falls back to the chapter,
 *             then the subject, when the class has no planned topics)
 *   chapter → the class's chapter(s)
 *   subject → the class's subject
 *   all     → everything
 */
import type { OnlineClass } from './classes';

export type ContentScope = 'class' | 'chapter' | 'subject' | 'all';

export interface ScopedLike { subjectId?: string; chapterId?: string; topicId?: string }

export const SCOPE_LABELS: Record<ContentScope, string> = {
  class: "This class's topics",
  chapter: 'Chapter',
  subject: 'Subject',
  all: 'Everything',
};

function classChapterIds(cls: OnlineClass): Set<string> {
  const ids = new Set<string>();
  if (cls.chapterId) ids.add(cls.chapterId);
  (cls.plannedTopics || []).forEach((t) => t.chapterId && ids.add(t.chapterId));
  return ids;
}

/** Scopes that make sense for this class (always ends with "all"). */
export function availableScopes(cls: OnlineClass | undefined): ContentScope[] {
  if (!cls) return ['all'];
  const scopes: ContentScope[] = [];
  if ((cls.plannedTopics || []).length) scopes.push('class');
  if (classChapterIds(cls).size) scopes.push('chapter');
  if (cls.subjectId) scopes.push('subject');
  scopes.push('all');
  return scopes;
}

/** The narrowest available scope is the default. */
export function defaultScope(cls: OnlineClass | undefined): ContentScope {
  return availableScopes(cls)[0];
}

export function scopeFilter(cls: OnlineClass | undefined, scope: ContentScope): (item: ScopedLike) => boolean {
  if (!cls || scope === 'all') return () => true;
  if (scope === 'class') {
    const topics = new Set((cls.plannedTopics || []).map((t) => t.topicId));
    if (topics.size) return (i) => !!i.topicId && topics.has(i.topicId);
    return scopeFilter(cls, classChapterIds(cls).size ? 'chapter' : 'subject');
  }
  if (scope === 'chapter') {
    const chapters = classChapterIds(cls);
    if (chapters.size) return (i) => !!i.chapterId && chapters.has(i.chapterId);
    return scopeFilter(cls, 'subject');
  }
  // subject
  if (cls.subjectId) return (i) => i.subjectId === cls.subjectId;
  return () => true;
}

/** Case-insensitive search across the given text fields. */
export function matchesSearch(query: string, ...fields: (string | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f || '').toLowerCase().includes(q));
}

/**
 * A link that can be shown INSIDE the app, or null if the site doesn't allow
 * it (then only "Open in new tab" is offered).
 *   Google Drive files, Docs/Slides/Sheets → their /preview page
 *   YouTube → the embed player
 *   Direct .pdf links → as is (some sites still block this)
 */
export function embeddableUrl(link: string | undefined): string | null {
  if (!link) return null;
  let url: URL;
  try { url = new URL(link.trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'drive.google.com') {
    const m = url.pathname.match(/\/file\/d\/([\w-]+)/);
    const id = m?.[1] || (url.pathname === '/open' ? url.searchParams.get('id') : null);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if (host === 'docs.google.com') {
    const m = url.pathname.match(/^\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
    return m ? `https://docs.google.com/${m[1]}/d/${m[2]}/preview` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
  }
  if (/\.pdf$/i.test(url.pathname)) return url.toString();
  return null;
}
