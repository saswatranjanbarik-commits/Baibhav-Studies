/**
 * Class questions & comments (v1.5) — a live, shared board for one class.
 *
 * WHERE IT IS STORED
 *   Firestore document  appStore/classroom_<classId>
 *     { classId, updatedAt, messages: { <messageId>: ClassMessage } }
 *
 *   - A NEW document per class, separate from appStore/global_store, so the
 *     main study data is untouched and doesn't grow towards its 1 MB limit.
 *   - Covered by the existing Firestore rule for appStore/{docId}
 *     (registered users only) — no rules change needed.
 *   - Messages are a map keyed by id, so two people writing at once never
 *     overwrite each other, and "answered"/quiz answers update one field.
 *   - Works offline too: Firestore keeps the writes and sends them later.
 *
 * Private notes ("My notes") are in appStore/mynotes_<user> — see below.
 */
import {
  doc, onSnapshot, setDoc, updateDoc, deleteField, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { STORE_COLLECTION } from './storeKeys';

export type MessageKind = 'question' | 'comment' | 'reply' | 'share';
export type ShareType = 'flashcard' | 'quiz' | 'note';

/** A copy of a shared learning item, so everyone sees it instantly. */
export interface SharedItem {
  type: ShareType;
  itemId: string;
  title: string;
  front?: string;          // flashcard
  back?: string;
  question?: string;       // quiz
  options?: string[];
  correctOptionIndex?: number;
  link?: string;           // study note
}

export interface QuizResponse { option: number; name: string; at: string }

export interface ClassMessage {
  id: string;
  kind: MessageKind;
  text: string;
  authorEmail: string;
  authorName: string;
  authorRole: string;
  createdAt: string;               // ISO time
  replyTo?: string;                // kind 'reply' → the message being answered
  answered?: boolean;              // questions only
  answeredBy?: string;
  share?: SharedItem;              // kind 'share'
  responses?: Record<string, QuizResponse>; // shared quiz → answers by user key
}

export const MAX_MESSAGE_LENGTH = 1000;

const roomDocId = (classId: string) => `classroom_${classId}`;
const notesDocId = (email: string) => `mynotes_${userKey(email)}`;

/** Firestore-field-safe key for a user (letters, digits, underscore). */
export function userKey(email: string): string {
  return (email || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/** Field-path-safe unique id (letters and digits only). */
export function newMessageId(now = Date.now()): string {
  return `m${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Firestore rejects `undefined` values — drop them (one level deep + share). */
export function clean<T extends object>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? clean(v as any) : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

export interface Thread { message: ClassMessage; replies: ClassMessage[] }

/**
 * Turn the message map into threads in time order: each top-level message
 * with its replies underneath. Replies whose parent was deleted are shown
 * as top-level so nothing disappears.
 */
export function buildThreads(map: Record<string, ClassMessage> | undefined): Thread[] {
  const all = Object.values(map || {}).filter((m) => m && m.id && m.createdAt);
  all.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const byId = new Set(all.map((m) => m.id));
  const threads: Thread[] = [];
  const index = new Map<string, Thread>();
  for (const m of all) {
    if (m.kind === 'reply' && m.replyTo && byId.has(m.replyTo) && index.has(m.replyTo)) {
      index.get(m.replyTo)!.replies.push(m);
    } else {
      const t = { message: m, replies: [] };
      threads.push(t);
      index.set(m.id, t);
    }
  }
  return threads;
}

export function openQuestionCount(map: Record<string, ClassMessage> | undefined): number {
  return Object.values(map || {}).filter((m) => m.kind === 'question' && !m.answered).length;
}

/** Tally of answers to a shared quiz: count per option. */
export function tallyResponses(m: ClassMessage): number[] {
  const n = m.share?.options?.length || 0;
  const counts = new Array(n).fill(0);
  for (const r of Object.values(m.responses || {})) {
    if (r.option >= 0 && r.option < n) counts[r.option]++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Firestore access
// ---------------------------------------------------------------------------

/** Live updates of a class board. Returns the unsubscribe function. */
/**
 * What the presenting tutor is showing in their Learning window (v1.5).
 * Followers see exactly this. A copy of the item is included so it shows
 * instantly on the student's screen.
 */
export interface PresentView {
  tab: 'notes' | 'flashcards' | 'quiz';
  item?: SharedItem;        // the note / card / question on screen (none = list)
  flipped?: boolean;        // flashcard showing its answer
  revealed?: boolean;       // quiz answer shown
  label?: string;           // e.g. "Card 3 of 12"
  /** YouTube note: the tutor's player — followers play/pause/seek to match. */
  media?: MediaState;
}
export interface MediaState { playing: boolean; time: number; at: string }
export interface PresentState extends PresentView {
  by: string;               // presenter email
  byName: string;
  startedAt: string;        // ISO — a new presentation has a new value
  at: string;               // ISO — last change
}

/**
 * The tutor's window layout (v1.5). Students' class rooms use it — only the
 * tutor/admin can switch windows on/off or resize them.
 */
export interface SharedLayout {
  show: { video: boolean; whiteboard: boolean; questions: boolean; learning: boolean };
  mainRatio: number;
  stageRatio: number;
  sideRatio: number;
  stageTab: 'video' | 'whiteboard';
  sideTab: 'questions' | 'learning';
  by: string;
  at: string;
}

/** Shared class-room state kept on the class board document (v1.5). */
export interface BoardMeta { wbPage: number; wbPages: number; present: PresentState | null; layout: SharedLayout | null }

export function listenToClassBoard(
  classId: string,
  onData: (messages: Record<string, ClassMessage>, meta: BoardMeta) => void,
  onError: (message: string) => void,
): () => void {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.data() || {};
      const wbPages = Math.max(1, Number(data.wbPages) || 1);
      const wbPage = Math.min(wbPages, Math.max(1, Number(data.wbPage) || 1));
      const present = data.present && data.present.by && data.present.tab ? (data.present as PresentState) : null;
      const layout = data.layout && data.layout.show ? (data.layout as SharedLayout) : null;
      onData((data.messages as Record<string, ClassMessage>) || {}, { wbPage, wbPages, present, layout });
    },
    (err) => {
      console.warn('Class board listener failed:', err);
      onError(err.code === 'permission-denied'
        ? 'You do not have permission to see the class board.'
        : 'Could not load the class board. Check the internet connection.');
    },
  );
}

/** Add a message (creates the class board document on first use). */
export async function postMessage(classId: string, message: ClassMessage): Promise<void> {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  // merge:true deep-merges the "messages" map, so other messages are kept.
  await setDoc(ref, {
    classId,
    updatedAt: serverTimestamp(),
    messages: { [message.id]: clean(message) },
  }, { merge: true });
}

/**
 * Move everyone's whiteboard to a page (pages are shared: all see the same
 * page). Pass `pages` to also change the number of pages (add a page).
 */
export async function setWhiteboardPage(classId: string, page: number, pages?: number) {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  const data: Record<string, unknown> = { classId, wbPage: page, updatedAt: serverTimestamp() };
  if (pages) data.wbPages = pages;
  await setDoc(ref, data, { merge: true });
}

/** Publish the tutor's window layout to the class. */
export async function setSharedLayout(classId: string, layout: SharedLayout) {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  await setDoc(ref, { classId, layout: clean(layout) }, { mergeFields: ['classId', 'layout'] });
}

/** Start/update (state) or stop (null) presenting the Learning window. */
export async function setPresent(classId: string, state: PresentState | null) {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  if (state) {
    // mergeFields replaces the whole "present" value (no leftovers from the previous item).
    await setDoc(ref, { classId, present: clean(state) }, { mergeFields: ['classId', 'present'] });
  } else {
    await setDoc(ref, { present: deleteField() }, { merge: true });
  }
}

export async function setAnswered(classId: string, messageId: string, answered: boolean, by: string) {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  await updateDoc(ref, {
    [`messages.${messageId}.answered`]: answered,
    [`messages.${messageId}.answeredBy`]: answered ? by : deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMessage(classId: string, messageId: string) {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  await updateDoc(ref, { [`messages.${messageId}`]: deleteField(), updatedAt: serverTimestamp() });
}

/** Record (or change) this user's answer to a shared quiz question. */
export async function answerSharedQuiz(classId: string, messageId: string, email: string, name: string, option: number) {
  const ref = doc(db, STORE_COLLECTION, roomDocId(classId));
  const response: QuizResponse = { option, name, at: new Date().toISOString() };
  await updateDoc(ref, { [`messages.${messageId}.responses.${userKey(email)}`]: response });
}

// ---------------------------------------------------------------------------
// "My notes" — one document per user: appStore/mynotes_<user>
//   { email, notes: { <classId>: { text, updatedAt } } }
// Only shown to that user in the app (the data sits with the other study
// data, which all registered family members can access).
// ---------------------------------------------------------------------------

export function listenToMyNotes(email: string, classId: string, onText: (text: string | null) => void): () => void {
  const ref = doc(db, STORE_COLLECTION, notesDocId(email));
  return onSnapshot(
    ref,
    (snap) => onText((snap.data()?.notes?.[classId]?.text as string | undefined) ?? null),
    (err) => { console.warn('My notes listener failed:', err); onText(null); },
  );
}

export async function saveMyNotes(email: string, classId: string, text: string) {
  const ref = doc(db, STORE_COLLECTION, notesDocId(email));
  await setDoc(ref, {
    email: email.toLowerCase(),
    notes: { [classId]: { text, updatedAt: new Date().toISOString() } },
  }, { merge: true });
}
