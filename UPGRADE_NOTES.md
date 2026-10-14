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
