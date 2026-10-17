/**
 * Backup page (Admin only).
 *
 *  - Download: saves ALL study data (appStore/global_store) and all user
 *    profiles (users collection) to a single JSON file on your computer.
 *  - Restore missing items: reads a backup file and puts back any records
 *    that are no longer in the cloud. It NEVER deletes or overwrites
 *    anything that is currently there, so it is safe to run at any time.
 *  - Storage usage: Firestore limits one document to 1 MB and all study data
 *    lives in one document. This shows how full it is.
 */
import React, { useRef, useState } from 'react';
import { collection, doc, getDocFromServer, getDocs, runTransaction } from 'firebase/firestore';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';
import { db } from '../lib/firebase';
import { STORE_COLLECTION, STORE_DOC_ID, STORE_KEY_PREFIX } from '../lib/storeKeys';
import { FIRESTORE_DOC_LIMIT_BYTES, STORE_SIZE_WARNING_RATIO } from '../config/app';
import { useSyncStatus } from '../components/StoreSync';
import { todayStr } from '../lib/dates';

/** Shape of a backup file. `version` lets future code read old backups. */
interface BackupFile {
  version: 1;
  createdAt: string;
  store: Record<string, any>;
  users: Record<string, any>;
  /** v1.5 (optional): class boards, whiteboard pages, personal class notes and scanned pages, keyed by document id. */
  classrooms?: Record<string, any>;
}

export default function Backup() {
  const { docSizeBytes } = useSyncStatus();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const usedRatio = docSizeBytes / FIRESTORE_DOC_LIMIT_BYTES;
  const usedPct = Math.min(100, Math.round(usedRatio * 1000) / 10);

  // ---- Download -------------------------------------------------------------
  const handleDownload = async () => {
    setBusy(true);
    setMessage(null);
    try {
      // Read straight from the server so the backup is never a stale cache.
      const storeSnap = await getDocFromServer(doc(db, STORE_COLLECTION, STORE_DOC_ID));
      const usersSnap = await getDocs(collection(db, 'users'));
      // v1.5: class boards (appStore/classroom_*), whiteboard pages (appStore/whiteboard_*)
      // personal class notes (appStore/mynotes_*) and scanned work (appStore/scan_*)
      const extraSnap = await getDocs(collection(db, STORE_COLLECTION));
      const classrooms = Object.fromEntries(
        extraSnap.docs
          .filter((d) => /^(classroom_|whiteboard_|mynotes_|scan_)/.test(d.id))
          .map((d) => [d.id, d.data()]),
      );

      const backup: BackupFile = {
        version: 1,
        createdAt: new Date().toISOString(),
        store: storeSnap.exists() ? storeSnap.data() : {},
        users: Object.fromEntries(usersSnap.docs.map((d) => [d.id, d.data()])),
        classrooms,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edutrack-backup-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const counts = Object.entries(backup.store)
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => `${k.replace(STORE_KEY_PREFIX, '')}: ${(v as any[]).length}`)
        .join(', ');
      setMessage({ kind: 'ok', text: `Backup downloaded. ${counts}` });
    } catch (e: any) {
      console.error(e);
      setMessage({ kind: 'error', text: `Backup failed: ${e?.message || e}` });
    } finally {
      setBusy(false);
    }
  };

  // ---- Restore missing items --------------------------------------------------
  const handleRestoreFile = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      if (!parsed || typeof parsed.store !== 'object') {
        throw new Error('This does not look like an EduTrack backup file.');
      }

      const storeRef = doc(db, STORE_COLLECTION, STORE_DOC_ID);
      const restoredCounts: Record<string, number> = {};

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(storeRef);
        const current = snap.exists() ? snap.data() : {};
        const updates: Record<string, any> = {};

        for (const [key, backupValue] of Object.entries(parsed.store)) {
          if (!key.startsWith(STORE_KEY_PREFIX)) continue;
          const cloudValue = current[key];

          if (cloudValue === undefined) {
            // Whole data set missing from the cloud → put it back.
            updates[key] = backupValue;
            restoredCounts[key] = Array.isArray(backupValue) ? backupValue.length : 1;
          } else if (Array.isArray(cloudValue) && Array.isArray(backupValue)) {
            // Add back records (by id) that are missing; never touch existing ones.
            const existingIds = new Set(cloudValue.map((i: any) => i?.id).filter(Boolean));
            const missing = backupValue.filter((i: any) => i && i.id && !existingIds.has(i.id));
            if (missing.length > 0) {
              updates[key] = [...cloudValue, ...missing];
              restoredCounts[key] = missing.length;
            }
          }
        }

        if (Object.keys(updates).length > 0) tx.set(storeRef, updates, { merge: true });
      });

      const summary = Object.entries(restoredCounts)
        .map(([k, n]) => `${k.replace(STORE_KEY_PREFIX, '')}: ${n}`)
        .join(', ');
      setMessage({
        kind: 'ok',
        text: summary ? `Restored missing items — ${summary}.` : 'Nothing to restore: everything in the backup is already in the cloud.',
      });
    } catch (e: any) {
      console.error(e);
      setMessage({ kind: 'error', text: `Restore failed: ${e?.message || e}` });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Database className="h-6 w-6 text-emerald-600" /> Backup &amp; Storage
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Download a copy of all study data regularly (e.g. once a week) and keep it somewhere safe.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border text-sm flex gap-2 ${
            message.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.kind === 'ok' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span className="break-words">{message.text}</span>
        </div>
      )}

      {/* Storage usage */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <HardDrive className="h-5 w-5 text-slate-500" /> Cloud storage used
        </h3>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${usedRatio >= STORE_SIZE_WARNING_RATIO ? 'bg-red-500' : usedRatio >= 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {(docSizeBytes / 1024).toFixed(0)} KB of 1,024 KB ({usedPct}%)
        </p>
        {usedRatio >= STORE_SIZE_WARNING_RATIO && (
          <p className="mt-2 text-sm text-red-700 font-semibold">
            Storage is getting full. Download a backup now; the data will need to be split across
            more documents before it reaches 100%, or new saves will fail.
          </p>
        )}
      </section>

      {/* Download */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-1">Download backup</h3>
        <p className="text-sm text-slate-500 mb-4">
          Saves every log, plan, syllabus, note, flashcard, task and user profile to one JSON file.
        </p>
        <button
          onClick={handleDownload}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg"
        >
          <Download className="h-4 w-4" /> {busy ? 'Working…' : 'Download backup'}
        </button>
      </section>

      {/* Restore */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-1">Restore missing items</h3>
        <p className="text-sm text-slate-500 mb-4">
          Choose a backup file to put back any records that have gone missing. Existing data is never
          changed or deleted. (User accounts are not restored.)
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && confirm(`Restore missing items from "${f.name}"?`)) handleRestoreFile(f);
            else if (fileInput.current) fileInput.current.value = '';
          }}
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold px-4 py-2 rounded-lg"
        >
          <Upload className="h-4 w-4" /> Choose backup file…
        </button>
      </section>
    </div>
  );
}
