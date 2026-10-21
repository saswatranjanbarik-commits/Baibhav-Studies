/**
 * Homework submissions (v1.5) — saved DIRECTLY to the cloud, not through the
 * general background sync, so a submission is confirmed the moment it is
 * saved and appears on the tutor's screen live.
 *
 *   Firestore document  appStore/task_submissions
 *     { subs: { <taskId>: Submission },
 *       refs: { <taskId>: TaskFiles } }   ← v1.5: files the TUTOR adds to a task
 *                                           (instructions: audio, PDF, photos, scans)
 *
 *   - One small record per task (page ids, who/when, feedback, sizes); the
 *     pages themselves are in appStore/scan_<id> (lib/scans.ts).
 *   - Covered by the existing appStore rule — no Firestore rules change.
 *   - The task itself is still marked "Completed" in dugu_tasks as before.
 */
import { doc, onSnapshot, setDoc, deleteField, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { STORE_COLLECTION } from './storeKeys';
import { deleteScanPages } from './scans';

export interface Submission {
  taskId: string;
  scanIds: string[];
  pages: number;
  /** Approximate stored size of the pages (bytes). */
  bytes: number;
  submittedBy: string;       // name
  submittedByEmail: string;
  submittedAt: string;       // ISO
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Pages removed to save space — the task stays completed. */
  filesRemovedAt?: string;
  filesRemovedBy?: string;
  pagesRemoved?: number;
}

/** Files the tutor attached to a task (instructions / reference). */
export interface TaskFiles {
  taskId: string;
  scanIds: string[];
  bytes: number;
  addedBy: string;
  addedAt: string;
}

const ref = () => doc(db, STORE_COLLECTION, 'task_submissions');

function clean<T extends object>(o: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
}

/** Live list of all submissions, by task id. */
export function listenToSubmissions(
  onData: (subs: Record<string, Submission>, refs: Record<string, TaskFiles>) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    ref(),
    (snap) => onData((snap.data()?.subs as Record<string, Submission>) || {}, (snap.data()?.refs as Record<string, TaskFiles>) || {}),
    (err) => {
      console.warn('Submissions listener failed:', err);
      onError(err.code === 'permission-denied'
        ? 'This account is not allowed to see submissions.'
        : 'Could not load submissions. Check the internet connection.');
    },
  );
}

/** Save (create or replace) one task's submission; resolves when the cloud has it. */
export async function saveSubmission(sub: Submission): Promise<void> {
  // merge:true keeps every other task's record; this task's record is replaced field by field.
  await setDoc(ref(), { subs: { [sub.taskId]: clean(sub) } }, { merge: true });
}

/** Add newly scanned pages to a task (creates the submission if needed). */
export async function addPages(
  current: Submission | undefined,
  taskId: string,
  scanIds: string[],
  bytes: number,
  by: { name: string; email: string },
): Promise<Submission> {
  const allIds = [...(current?.scanIds || []), ...scanIds];
  const sub: Submission = {
    ...(current || {}),
    taskId,
    scanIds: allIds,
    pages: allIds.length,
    bytes: (current?.bytes || 0) + bytes,
    submittedBy: by.name,
    submittedByEmail: by.email,
    submittedAt: new Date().toISOString(),
  } as Submission;
  await saveSubmission(sub);
  return sub;
}

/** Check with the server that the submission really is saved. */
export async function confirmSubmission(taskId: string): Promise<boolean> {
  try {
    const snap = await getDocFromServer(ref());
    return !!snap.data()?.subs?.[taskId];
  } catch {
    return false;
  }
}

/**
 * Free the space: delete the pages but keep the record (the task stays
 * completed, with "files removed on … by …").
 */
export async function removeSubmissionFiles(sub: Submission, by: string): Promise<void> {
  await deleteScanPages(sub.scanIds);
  await saveSubmission({
    ...sub,
    scanIds: [],
    pagesRemoved: (sub.pagesRemoved || 0) + sub.scanIds.length,
    pages: 0,
    bytes: 0,
    filesRemovedAt: new Date().toISOString(),
    filesRemovedBy: by,
  });
}

/** Remove a task's submission completely (when the task is deleted). */
export async function deleteSubmission(sub: Submission): Promise<void> {
  await deleteScanPages(sub.scanIds);
  await setDoc(ref(), { subs: { [sub.taskId]: deleteField() } }, { merge: true });
}

/** Human-readable size. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// v1.5: tutor's files on a task
// ---------------------------------------------------------------------------

export async function addTaskFiles(current: TaskFiles | undefined, taskId: string, scanIds: string[], bytes: number, by: string): Promise<void> {
  const files: TaskFiles = {
    taskId,
    scanIds: [...(current?.scanIds || []), ...scanIds],
    bytes: (current?.bytes || 0) + bytes,
    addedBy: by,
    addedAt: new Date().toISOString(),
  };
  await setDoc(ref(), { refs: { [taskId]: files } }, { merge: true });
}

/** Remove all of a task's tutor files (and their stored pages). */
export async function deleteTaskFiles(files: TaskFiles): Promise<void> {
  await deleteScanPages(files.scanIds);
  await setDoc(ref(), { refs: { [files.taskId]: deleteField() } }, { merge: true });
}
