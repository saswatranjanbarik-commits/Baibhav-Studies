/**
 * The names of every data set saved in Firestore.
 *
 * Each key is a FIELD inside the single Firestore document `appStore/global_store`
 * and is mirrored into the browser's localStorage by StoreSync.
 *
 * ⚠️  NEVER rename or remove these strings. Your existing study history is
 * saved under exactly these names. Renaming one would make that data
 * invisible to the app (it would still be in Firestore, but orphaned).
 * To add a new feature, ADD a new key instead.
 */
export const STORE_KEYS = {
  dailyLogs: 'dugu_daily_logs',
  syllabus: 'dugu_syllabus_v2',
  studyPlan: 'dugu_study_plan',
  revisions: 'dugu_revisions',
  tasks: 'dugu_tasks',
  events: 'dugu_events',
  timetable: 'dugu_timetable',
  studyNotes: 'dugu_study_notes',
  teamNotes: 'dugu_team_notes',
  learningItems: 'dugu_learning_items', // flashcards & quizzes
  appreciation: 'dugu_appreciation',
  upcomingEvent: 'dugu_upcoming_event',
  reminders: 'dugu_reminders', // v1.2: per-user study reminder settings
  revisionSettings: 'dugu_revision_settings', // v1.3: revision "fresh start" settings
  revisionsArchive: 'dugu_revisions_archive', // v1.3: revisions put aside by a fresh start
  topicStatus: 'dugu_topic_status', // v1.3: topics marked completed directly by a tutor/admin
} as const;

/** Every key that StoreSync mirrors starts with this prefix. */
export const STORE_KEY_PREFIX = 'dugu_';

/** Firestore location of the shared study data. */
export const STORE_COLLECTION = 'appStore';
export const STORE_DOC_ID = 'global_store';

/**
 * Safely read and parse a JSON value from localStorage.
 * Returns `fallback` if the key is missing or the stored text is corrupt,
 * so one bad value can't crash a page.
 */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    console.error(`Could not read "${key}" from local storage`, e);
    return fallback;
  }
}
