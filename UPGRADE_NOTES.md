# Upgrade notes — v1.5 (split-screen class room + live whiteboard)

No existing data, collections, field names or Firestore rules were changed.
New, additive only: two kinds of small Firestore documents in the existing
`appStore` collection (already allowed by the current rules — **no rules
update needed**):
- `appStore/classroom_<classId>` — the live class board of one class
- `appStore/whiteboard_<classId>_<page>` — one whiteboard page
- `appStore/mynotes_<user>` — each person's own class notes
They are separate from `appStore/global_store`, so they don't use any of its
1 MB space. The Backup page's download now includes them too ("classrooms").
Free-tier use: each finished stroke is one small save; a busy class uses a
few hundred of Firestore's 20,000 free daily writes.

## What's new
- **Scan & submit homework (Tasks):** "Scan & submit" opens the camera on a
  tablet/phone — one photo per page, rotate, "Clean" mode (white paper, dark
  writing, like a scanner), reorder, or add photos / a small PDF (≤ ~650 KB)
  from the gallery. The tutor sees thumbnails, opens pages full screen
  (zoom, rotate, download) and can write feedback + "Mark reviewed". The
  student can "Add more pages" until it is reviewed.
  **Fix:** the old "Upload File" in Submit Work never saved the file (only
  its name). It is replaced by Scan; old entries show a note to re-submit.
- **Scan answers in class:** the 📷 button next to Send on the class board
  scans a handwritten answer (optionally as a reply to the tutor's question,
  with a note). It appears on the tutor's board straight away; tap to enlarge.
- **Storage (free plan):** Firebase file Storage needs the paid plan, so each
  page is compressed in the app and saved as its own Firestore document
  `appStore/scan_<id>` (existing rules cover it). The free 1 GB holds several
  thousand pages. Tasks keep only the list of page ids (new optional fields
  `scanIds`, `submittedBy/At`, `reviewNote`, `reviewedBy/At`). Deleting a task
  or a class-board message also deletes its pages. The Backup download
  includes scanned pages (the file gets bigger).
- **Study Notes:** the Topic is now optional ("Whole chapter"), the title is
  filled in automatically (sub-topic/topic/chapter + link type), and each
  note has **Edit** and **Delete** (tutor/admin). Existing notes keep their
  titles and fields; notes without a topic simply have an empty topic.
- **Dictation:** tap into any text box (Daily Log, class board, My notes,
  tasks, whiteboard text…) and a 🎤 button appears on the right — speak and
  the words are typed. Say "full stop", "comma", "question mark", "new line",
  "new paragraph". Languages: English (India/UK/US), Hindi. Uses the browser's
  free speech recognition (Chrome/Edge/Android/Safari; needs internet; not in
  Firefox). On a tablet, dictating during a video class may not work while
  the call is using the microphone.
- **Tutor controls the class-room layout:** only tutor/admin can switch
  windows on/off or resize them; the student's class room follows the
  tutor's layout automatically (narrow screens still show tabs).
- **Presenting YouTube videos:** play, pause and jumps are copied to the
  student, and the sound plays on the student's own device. If the student's
  browser blocks starting the sound, a "Tap to play with your tutor" button
  appears once.
- **Scrolling PDFs / Google Drive files** can't be copied into another
  person's screen (those sites don't allow it) — the tutor sees a reminder
  to use **Share screen** for that. Share screen now asks for sound too: in
  Chrome/Edge choose the **tab** and tick **"Also share tab audio"**.
- **Class room in up to four windows**
  1. **Video** (as before)
  2. **Questions** — *Class board* (live, shared): questions and comments,
     replies, "Mark answered" (tutor or the asker), delete own messages;
     open-question count on the header button. *My notes*: private notepad
     per class, saved automatically, Download as .txt.
  3. **Learning** — Study notes, Flashcards, Quiz for the class's planned
     topics (or chapter / subject / everything), with search. Google
     Drive/Docs/Slides, YouTube and PDF links open inside the window; other
     links open in a new tab.
  4. **Whiteboard** (switch on with the ✎ button) — live and shared: pen,
     highlighter, line, rectangle, circle, text, eraser (removes whole
     strokes), 6 colours, 3 sizes, undo your own last stroke, grid on/off,
     download the page as a picture (PNG), several pages (everyone sees the
     same page). Tutor/Admin can clear a page. Works with mouse, finger and
     stylus; the drawing looks the same on every screen size.
- **Present to class** (Tutor/Admin, top of the Learning window): while on,
  the student's Learning window shows exactly what the tutor opens — the same
  study note, the same flashcard (front or back, as the tutor flips it), the
  same quiz question (the student can tap an answer; the right one shows when
  the tutor reveals it). The student can press "Browse myself" and "Follow"
  again. Stops when the tutor presses Stop or leaves the class room.
  Note: inside an embedded Google Drive/PDF note, scrolling and page turns
  are not mirrored (those sites don't allow it) — use Share screen for that.
- **Share screen and Chat buttons for everyone** (tutor and student) in the
  class room header, always visible even when the video window is small.
  The server now also switches chat and screen sharing on for rooms created
  earlier, and every pass allows screen sharing.
  Screen sharing needs a laptop/computer browser — Android tablets and
  iPads can't share their screen from a browser (the button explains this).
- **Layout:** left column = Video above Whiteboard, right column = Learning
  above Questions; every divider can be dragged.
- **Switch windows on/off** with the header buttons (the last one can't be
  switched off); hiding the video keeps you in the call with sound.
- **Resize** by dragging the bars (mouse or touch); double-click/tap a bar to
  reset it; ↺ resets the whole layout. Remembered per device.
- **Tablet/phone in portrait:** Video/Whiteboard on top and
  Learning/Questions below, each pair as tabs.
- **Show to class / Ask the class:** put a flashcard or note on the class
  board, or post a quiz question everyone answers live (the tutor sees who
  answered what; the student sees right/wrong after answering).
- **Class board** button on class cards — prepare before the class, use it
  with external-link (Google Meet) classes, and review questions afterwards.
- Docs: corrected the Daily.co note — a card on file is required (free use).

## New / changed files (v1.5)
New: src/lib/classroomLayout.ts, src/lib/classChat.ts, src/lib/classroomContent.ts,
src/lib/whiteboard.ts, src/components/classroom/Whiteboard.tsx,
src/components/classroom/PresentedView.tsx, src/components/classroom/VideoControls.tsx,
src/components/classroom/YouTubePlayer.tsx, src/lib/youtube.ts, src/lib/dictation.ts,
src/components/DictationButton.tsx, src/lib/scans.ts, src/components/scan/ScanCapture.tsx,
src/components/scan/ScanGallery.tsx,
src/components/classroom/ResizeHandle.tsx, src/components/classroom/LearningPanel.tsx,
src/components/classroom/QuestionsPanel.tsx, src/components/classroom/FlashcardDeck.tsx,
src/components/classroom/QuizRunner.tsx
Changed: src/pages/ClassRoom.tsx, src/components/ClassCard.tsx, src/pages/Backup.tsx,
src/components/DailyFrame.tsx, api/video-room.ts (chat + screen share for everyone),
src/pages/StudyNotes.tsx, src/pages/Tasks.tsx,
src/components/Layout.tsx (v1.5 label), README.md, UserManual.md, UPGRADE_NOTES.md

---

# Upgrade notes — v1.4 (online classes with in-app video)

No existing data, collections, field names or Firestore rules were changed.
New, additive only: the `dugu_classes` store key and a server function
`api/video-room.ts` (Vercel, free tier).

## What's new
- **Online Classes** (new menu item)
  - Tutors (Teacher role) and Admins **schedule classes**: subject, chapter,
    planned topics, start time, length, weekly repeat (4/8/12 weeks), notes.
  - **Time zones:** the scheduler types their own local time; everyone sees it
    in theirs (and "Tutor's time" is shown when different). Weekly classes keep
    the same local time across summer-time changes.
  - **Join** opens 10 minutes before the start and stays open until 30 minutes
    after the planned end. Video runs **inside EduTrack** in a private room.
    (A class can instead use an external meeting link, e.g. Google Meet.)
  - **Complete class** (tutor): tick topics covered, homework, notes. Adds a
    "Tutor" entry to the Daily Log for the class time (counts for streaks,
    study time, weekly report, Syllabus progress) and schedules 7/15/30-day
    revisions — exactly like a manual Daily Log entry.
  - **Cancel** one class, or (weekly series) all future ones.
- **Dashboard:** "Next online class" card with countdown and Join.
- **Reminders:** notification + banner 10 minutes before every class.
- Revision scheduling moved into `src/lib/revisionScheduler.ts` and is shared
  by the Daily Log and classes (same records as before).

## In-app video setup (once, free)
Video uses **Daily.co** (free tier: about 10,000 participant-minutes a month).
Daily asks for a **payment card on file** before rooms work ("Missing payment
method"), but nothing is charged while usage stays within the free minutes.
1. Sign up at **daily.co** (free) and choose a subdomain (e.g. dugu-edutrack).
2. Daily dashboard → **Developers** → copy your **API key**.
3. Vercel → baibhav-studies → **Settings → Environment Variables** →
   **Add**: Name `DAILY_API_KEY`, Value = the key, Environments **Production**
   and **Preview** → Save. (Never put this key in the code or share it.)
4. Redeploy (Deployments → ⋯ on the latest → Redeploy), or just merge v1.4.
Until this is done, classes can still be scheduled; in-app rooms show a
"not set up yet" message (classes with a meeting link work normally).

### Safety
- Rooms are **private**; only signed-in, registered EduTrack users get a pass.
- Passes expire 30 minutes after the class ends; rooms expire too.
- The tutor (and Admin) is the room **owner**; max 6 participants.
- The Daily key stays on the server (Vercel), never in the browser.

## New / changed files (v1.4)
New: api/video-room.ts, src/lib/classes.ts, src/lib/videoRoom.ts,
src/lib/revisionScheduler.ts, src/pages/Classes.tsx, src/pages/ClassRoom.tsx,
src/components/ClassCard.tsx, src/components/ScheduleClassModal.tsx,
src/components/CompleteClassModal.tsx, src/components/NextClassCard.tsx,
src/components/DailyFrame.tsx
Changed: vercel.json (rewrite skips /api), src/App.tsx, src/components/Sidebar.tsx,
src/components/ReminderScheduler.tsx, src/lib/reminders.ts, src/lib/storeKeys.ts,
src/pages/Dashboard.tsx, src/pages/DailyLog.tsx, README.md, UserManual.md,
UPGRADE_NOTES.md

---

# Upgrade notes — v1.3 (stay signed in, installable app & offline, streaks, weekly report)

No existing data, collections or field names were changed, and nothing new is
stored in the cloud except three small keys (see below). Firestore
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
- **Syllabus → Mark topics completed** (Tutor/Teacher & Admin) — tick off
  topics covered in class (e.g. before the mid-term) without Daily Log entries:
  a bulk checklist per subject (whole chapter / all Term-1 chapters / select
  all), plus "✓ Mark completed" on each topic, "✓ Mark chapter completed" on
  each chapter, and "Unmark". Marks show who marked them and when, and count
  in Syllabus status and Dashboard subject progress. They do NOT create Daily
  Log entries, revisions or streak days. New store key: `dugu_topic_status`.
- **Fix:** Syllabus now counts a Daily Log entry that covers several topics
  for each of those topics (before, such topics stayed "Pending").
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
src/pages/WeeklyReport.tsx, src/lib/revisionReset.ts, src/lib/topicStatus.ts,
src/components/TopicCompletionModal.tsx,
public/manifest.webmanifest, public/favicon.png, public/icons/(4 icons)
Changed: index.html, public/sw.js, src/main.tsx, src/App.tsx,
src/components/StoreSync.tsx, src/components/SyncStatusBar.tsx,
src/components/Layout.tsx, src/components/Sidebar.tsx, src/lib/firebase.ts,
src/lib/AuthContext.tsx, src/lib/storeKeys.ts, src/pages/Login.tsx,
src/pages/Dashboard.tsx, src/pages/Revisions.tsx, src/pages/DailyLog.tsx,
src/components/StreakCard.tsx, src/pages/WeeklyReport.tsx, src/pages/Syllabus.tsx,
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
