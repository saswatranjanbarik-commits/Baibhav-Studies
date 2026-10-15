# Dugu EduTrack

Study-tracking web app: daily logs, syllabus, study plan, revisions, flashcards,
tasks, calendar, timetable and appreciation points.

**Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 + Firebase (Auth + Firestore).
Hosted on Vercel as a static single-page app.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into /dist (what Vercel runs)
```

## Where things live

| Path | What it does |
|---|---|
| `src/lib/firebase.ts` | Firebase connection |
| `src/lib/AuthContext.tsx` | Login, roles, blocks unregistered accounts |
| `src/components/StoreSync.tsx` | Syncs study data between localStorage and Firestore |
| `src/lib/syncMerge.ts` / `syncQueue.ts` | Merge rules; durable queue of unsaved (offline) changes |
| `src/lib/studyStats.ts` | Streaks, badges, weekly report calculations |
| `src/pages/WeeklyReport.tsx` | Weekly progress report (printable) |
| `public/manifest.webmanifest`, `public/icons/` | Installable app |
| `src/pages/Classes.tsx`, `src/pages/ClassRoom.tsx` | Online classes: schedule, join (in-app video), complete |
| `src/lib/classes.ts` | Class records & time-zone handling (`dugu_classes`) |
| `src/components/classroom/`, `src/lib/classroomLayout.ts`, `src/lib/classChat.ts`, `src/lib/classroomContent.ts`, `src/lib/whiteboard.ts` | v1.5 split-screen class room: resizable windows, live class board, learning window, live whiteboard |
| `api/video-room.ts` | Vercel server function: private Daily.co room + pass (needs `DAILY_API_KEY`) |
| `src/lib/storeKeys.ts` | **The names of every saved data set — never rename these** |
| `src/lib/dates.ts` | Local-timezone date helpers (use instead of `toISOString()`) |
| `src/config/app.ts` | Primary admin email and storage limits |
| `src/pages/*` | One file per screen |
| `src/pages/Backup.tsx` | Admin backup download / restore-missing-items |
| `firestore.rules` | Database security rules (publish manually in the Firebase Console) |
| `src/lib/presence.ts` | "Who's online" heartbeat (collection `presence`) |
| `src/lib/reminders.ts` | Study reminder settings, notifications, calendar (.ics) export |
| `src/components/ReminderScheduler.tsx` | Fires reminders while the app is open |
| `src/lib/learningTree.ts` | Groups flashcards/quizzes by Subject → Chapter → Topic |
| `public/sw.js` | Service worker: notifications + offline (network-first pages, cached build files) |
| `.github/workflows/build-check.yml` | Free GitHub build check on every push |

## Data model (do not break)

* `users/{lower-case email}` → `{ id, email, username, role, timezone }`
* `presence/{lower-case email}` → online status (v1.2, new collection)
* `appStore/global_store` → one field per data set (`dugu_daily_logs`,
  `dugu_syllabus_v2`, `dugu_study_plan`, `dugu_revisions`, `dugu_tasks`,
  `dugu_events`, `dugu_timetable`, `dugu_study_notes`, `dugu_team_notes`,
  `dugu_learning_items`, `dugu_appreciation`, `dugu_upcoming_event`,
  `dugu_reminders` (v1.2), `dugu_revision_settings`, `dugu_revisions_archive`,
  `dugu_topic_status` (v1.3), `dugu_classes` (v1.4)).
* `appStore/classroom_<classId>` (v1.5) → the live class board for one class
  (`messages` map, shared whiteboard page). `appStore/whiteboard_<classId>_<page>`
  (v1.5) → whiteboard strokes. `appStore/mynotes_<user>` (v1.5) → each person's own class
  notes. Separate small documents, so they don't use the main 1 MB document.

Pages read/write `localStorage` with these keys; `StoreSync` mirrors them to
Firestore. New features must **add** keys or **optional** fields — never rename
or remove existing ones.

⚠️ Firestore limits one document to 1 MB. The Backup page shows how full
`global_store` is; the header warns the admin at 75%.

## Users

There is no public sign-up. The Admin creates accounts on **Manage Users**.
