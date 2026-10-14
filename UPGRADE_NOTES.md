# Upgrade notes — v1.3 (stay signed in, installable app & offline, streaks, weekly report)

No existing data, collections or field names were changed, and nothing new is
stored in the cloud except two small revision keys (see below). Firestore
rules are unchanged from v1.2.

## What's new
- **Stay signed in** — logins are remembered on the device until "Exit".
  A "Keep me signed in" box on the login page (untick on shared computers).
- **Install as an app** — "Install app" (Android/Chrome/Edge) or
  "Add to Home Screen" instructions (iPhone/iPad) at the bottom of the menu.
  Opens full-screen with its own icon.
- **Offline support**
  - The app opens without internet and shows the data already on the device.
  - Anything added offline is kept on the device (even if the app is closed)
    and uploaded automatically, with the usual safe merge, when back online.
  - Header badge/banner shows "offline" instead of an error.
- **Streaks & badges** (Dashboard) — current and best study streak, this
  week's study days, 10 badges. Calculated from the Daily Log.
- **Weekly Report** (new menu item) — study time per day and per subject,
  topics completed, doubts to discuss, revisions done/missed, tasks, points,
  comparison with last week. Browse previous weeks; "Print / PDF".
- **Revision Planner → Fresh start** (Admin) — archives all current revisions
  (nothing deleted; a backup file is downloaded too) and creates new revisions
  only for study logged from a chosen date. "Restore archived" undoes it.
  New store keys: `dugu_revision_settings`, `dugu_revisions_archive`.
- **Fix:** the one-time "upload browser-only data" rescue now runs once per
  device. Before, items deleted on one device could reappear when another
  device opened the app.

## Notes
- Study *time* needs "Time from / Time to" on Daily Log entries; entries
  without times still count as sessions and for streaks.
- Play/Activity logs and classes marked Teacher Absent/Rescheduled/Canceled
  don't count towards streaks or study time.
- A copy of the data is kept on each device for offline use (as before in
  browser storage, now also in the browser's database). On a shared computer,
  untick "Keep me signed in".

## New / changed files (v1.3)
New: src/lib/syncMerge.ts, src/lib/syncQueue.ts, src/lib/studyStats.ts,
src/lib/useStoredData.ts, src/lib/installApp.ts, src/components/StreakCard.tsx,
src/components/DayBarChart.tsx, src/components/InstallAppButton.tsx,
src/pages/WeeklyReport.tsx, src/lib/revisionReset.ts,
public/manifest.webmanifest, public/favicon.png, public/icons/(4 icons)
Changed: index.html, public/sw.js, src/main.tsx, src/App.tsx,
src/components/StoreSync.tsx, src/components/SyncStatusBar.tsx,
src/components/Layout.tsx, src/components/Sidebar.tsx, src/lib/firebase.ts,
src/lib/AuthContext.tsx, src/lib/storeKeys.ts, src/pages/Login.tsx,
src/pages/Dashboard.tsx, src/pages/Revisions.tsx, src/pages/DailyLog.tsx,
src/components/StreakCard.tsx, src/pages/WeeklyReport.tsx,
README.md, UPGRADE_NOTES.md

---

# Upgrade notes — v1.2 (clock, team online, reminders, grouped flashcards)

No existing data, collections or field names were changed. New, additive only:
a `presence` collection and a `dugu_reminders` key in the store.

## What's new
- **Header clock** — the user's local time, date and time zone (with GMT offset),
  detected from their device; updates every minute; compact on phones.
- **Team Online (Dashboard)** — shows ONLY people who are logged in and using the
  app right now, with their local time/zone. Everyone else is under "Offline"
  with "last seen". Exit marks you offline immediately; closing the tab drops
  you off within ~3 minutes.
- **Study Plan → Daily study reminder** — per user: time, days, message, and
  optional reminders 5–30 min before planned sessions. Delivered by:
  - **Add to calendar (.ics)** — repeating event with an alarm; works when the
    app is closed (best for phones). Also exports upcoming plan sessions.
  - **Browser notifications** while the app is open (any tab).
  - **In-app banner** if the app is opened after the reminder time.
- **Flashcards & Quiz grouped by Subject → Chapter → Topic** — counts at every
  level, "+ Card / + Quiz" on each topic (pre-selects the topic), and
  Practice/Quiz buttons for a whole subject, a chapter or a single topic.
  The Syllabus page's flashcard/quiz links now open the right session.
- **Automatic build check** on GitHub for every push (free).

## ⚠️ Required: update Firestore rules
Team Online needs one new rule block. Re-publish `firestore.rules`
(Firebase Console → Firestore → Rules → paste → Publish). Without it the app
still works; the Team Online panel just shows a notice.

## New / changed files (v1.2)
New: src/lib/timezone.ts, src/lib/presence.ts, src/lib/reminders.ts,
src/lib/learningTree.ts, src/components/HeaderClock.tsx,
src/components/TeamOnline.tsx, src/components/ReminderScheduler.tsx,
src/components/ReminderSettingsCard.tsx, src/components/LearningTree.tsx,
public/sw.js, .github/workflows/build-check.yml
Changed: firestore.rules, README.md, UPGRADE_NOTES.md, src/components/Layout.tsx,
src/lib/AuthContext.tsx, src/lib/storeKeys.ts, src/pages/Dashboard.tsx,
src/pages/StudyPlan.tsx, src/pages/Flashcards.tsx

---

# Upgrade notes — v1.1 (safety, security & bug fixes)

No database collections, documents or field names were changed.
Existing study data is read exactly as before.

## What changed

### Data safety
- **Backup page** (Admin → *Backup*): download all data as JSON; "Restore missing
  items" puts back deleted records without changing existing ones.
- **Saves no longer get lost** when the tab is closed within a second of an edit.
- **Failed saves are retried** automatically, and a red banner + "not saved" badge
  in the header tells you (previously failures were silent).
- **Storage meter**: all data lives in one Firestore document (1 MB max). The admin
  sees a warning at 75%.

### Security
- Public **sign-up removed** from the login page. Only accounts added on
  *Manage Users* can log in; anyone else is signed straight back out.
- **New `firestore.rules`**: only registered users can read/write; only admins can
  change user profiles. (Before, any account could read and wipe everything.)
- Admin-only pages (*Manage Users*, *Backup*) and *Team Notes* are now protected
  by role, not just hidden from the menu.
- Re-adding a previously removed user now works (it used to fail with
  "email already in use").

### Bug fixes
- Dashboard **"Revisions due"** count was always 0 — fixed.
- Daily Log **Teacher / Tutor** dropdown was always empty — now lists Teachers.
- **Dates use the local timezone.** Before, anything logged between midnight and
  5:30 am (India) was saved under the previous day.
- Dashboard no longer re-downloads the user list after every save.
- Header clock now updates.

### Clean-up
- Removed unused leftovers from AI Studio: `server.ts`, `src/db/*` (Postgres),
  patch/test/shell scripts, `firebase-applet-config.json`,
  `firebase-blueprint.json`, `metadata.json`.
- `npm run dev` / `npm run build` now run Vite directly.
- New shared modules: `src/config/app.ts`, `src/lib/dates.ts`,
  `src/lib/storeKeys.ts`, `src/lib/useTeamUsers.ts`, `src/components/SyncStatusBar.tsx`.
- Dependencies and lock files were left untouched.

## Files removed
server.ts, src/db/ (3 files), patch.js, patch_form.js, patch_dash_fixes.cjs,
add_csv_syllabus.sh, fix_syllabus.sh, remove_csv_studyplan.sh, rewrite_syllabus.sh,
test-firestore.js, test_localstorage.js, src/pages/Dashboard.tsx.test,
firebase-applet-config.json, firebase-blueprint.json, metadata.json, assets/.aistudio/
