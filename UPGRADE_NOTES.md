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
