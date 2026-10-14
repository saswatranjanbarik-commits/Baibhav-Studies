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
| `src/lib/storeKeys.ts` | **The names of every saved data set — never rename these** |
| `src/lib/dates.ts` | Local-timezone date helpers (use instead of `toISOString()`) |
| `src/config/app.ts` | Primary admin email and storage limits |
| `src/pages/*` | One file per screen |
| `src/pages/Backup.tsx` | Admin backup download / restore-missing-items |
| `firestore.rules` | Database security rules (publish manually in the Firebase Console) |

## Data model (do not break)

* `users/{lower-case email}` → `{ id, email, username, role, timezone }`
* `appStore/global_store` → one field per data set (`dugu_daily_logs`,
  `dugu_syllabus_v2`, `dugu_study_plan`, `dugu_revisions`, `dugu_tasks`,
  `dugu_events`, `dugu_timetable`, `dugu_study_notes`, `dugu_team_notes`,
  `dugu_learning_items`, `dugu_appreciation`, `dugu_upcoming_event`).

Pages read/write `localStorage` with these keys; `StoreSync` mirrors them to
Firestore. New features must **add** keys or **optional** fields — never rename
or remove existing ones.

⚠️ Firestore limits one document to 1 MB. The Backup page shows how full
`global_store` is; the header warns the admin at 75%.

## Users

There is no public sign-up. The Admin creates accounts on **Manage Users**.
