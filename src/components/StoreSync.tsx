/**
 * StoreSync — keeps the browser's localStorage and Firestore in sync.
 *
 * HOW IT WORKS
 *  1. On login it subscribes (live) to the Firestore document
 *     `appStore/global_store`. Every field in that document (dugu_daily_logs,
 *     dugu_tasks, …) is copied into localStorage under the same key.
 *  2. Pages read and write localStorage. This component wraps
 *     `localStorage.setItem` so every save is also queued for Firestore.
 *  3. Queued saves are batched (800 ms) and written in a transaction that
 *     MERGES with what's already in the cloud (by item `id`), so two devices
 *     saving at once don't overwrite each other. (Rules: src/lib/syncMerge.ts)
 *  4. A `cloud_sync_update` window event tells pages to re-read their data.
 *
 * SAFETY
 *  - v1.1: failed saves are retried; save status is shown in the header.
 *  - v1.3 (offline support):
 *    · Unsaved changes are kept in this browser (SyncQueue) and survive going
 *      offline, closing the tab or restarting the device. They upload
 *      automatically when the connection returns.
 *    · While changes are waiting, the app keeps SHOWING them (they are merged
 *      on top of the cloud copy), so an offline log doesn't seem to vanish.
 *    · The one-time "upload browser-only data" step now uses the same safe
 *      merge as every other save, and only runs against fresh server data.
 *    · If the cloud can't be reached at start-up, the app opens anyway with
 *      the data already on this device.
 *
 * The data format is EXACTLY the same as before.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { STORE_COLLECTION, STORE_DOC_ID, STORE_KEY_PREFIX } from '../lib/storeKeys';
import { isIdObjectArray, mergeValue } from '../lib/syncMerge';
import { SyncQueue } from '../lib/syncQueue';

// ---------------------------------------------------------------------------
// Sync status shared with the rest of the app
// ---------------------------------------------------------------------------

export type SyncState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export interface SyncStatus {
  state: SyncState;
  /** Human-readable reason for the last failure, if any. */
  lastError: string | null;
  /** Approximate size of the cloud document in bytes. */
  docSizeBytes: number;
  /** Number of data sets with changes not yet saved to the cloud. */
  pendingCount: number;
  /** Retry any failed saves right now. */
  retryNow: () => void;
}

const SyncStatusContext = createContext<SyncStatus>({
  state: 'idle',
  lastError: null,
  docSizeBytes: 0,
  pendingCount: 0,
  retryNow: () => {},
});

/** Read the current cloud-sync status from any component. */
export const useSyncStatus = () => useContext(SyncStatusContext);

/** Approximate stored size of a value, in bytes. */
function approxSizeBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

const DEBOUNCE_MS = 800;
const RETRY_MS = 10_000;
/** If the cloud hasn't answered by then, open the app with local data. */
const STARTUP_TIMEOUT_MS = 5_000;

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoreSync({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [docSizeBytes, setDocSizeBytes] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const { currentUser } = useAuth();

  // What the cloud told us last.
  const lastKnownCloudData = useRef<Record<string, any>>({});
  // Whether the one-time "upload browser-only data" step has run.
  const initialUploadDone = useRef<boolean>(false);
  // Exposed so the UI's "Retry" button can trigger a flush.
  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    const originalSetItem = window.localStorage.setItem;
    const originalRemoveItem = window.localStorage.removeItem;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const storeRef = doc(db, STORE_COLLECTION, STORE_DOC_ID);
    let disposed = false;
    let syncTimeout: ReturnType<typeof setTimeout> | undefined;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    // ---- 0. The durable queue of unsaved changes (per user, this browser only)
    // No "dugu_" prefix, so it is never uploaded itself.
    const PENDING_KEY = `edutrack_pending_sync:${currentUser.email.toLowerCase()}`;
    const queue = new SyncQueue(
      (json) => {
        try {
          if (json) originalSetItem.call(window.localStorage, PENDING_KEY, json);
          else originalRemoveItem.call(window.localStorage, PENDING_KEY);
        } catch { /* storage full/blocked — the in-memory queue still works */ }
        setPendingCount(queue ? queue.size : 0);
      },
      window.localStorage.getItem(PENDING_KEY),
    );
    setPendingCount(queue.size);
    if (queue.size > 0) setSyncState(isOffline() ? 'offline' : 'saving');

    const markFailure = (e: any) => {
      if (isOffline() || e?.code === 'unavailable') {
        setSyncState('offline');
        setLastError(null);
      } else {
        setSyncState('error');
        setLastError(describeError(e));
      }
    };

    // ---- 1. Local → cloud -------------------------------------------------
    /** Write everything queued so far to Firestore. */
    const flush = () => {
      clearTimeout(syncTimeout);
      clearTimeout(retryTimeout);
      if (disposed || queue.isSending || !queue.hasQueued()) return;
      if (isOffline()) { setSyncState('offline'); return; } // the 'online' event will flush

      const toSend = queue.takeForSend();
      setSyncState('saving');
      const written: Record<string, any> = {};

      runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(storeRef);
        const currentData = docSnap.exists() ? docSnap.data() : {};
        for (const [k, newVal] of Object.entries(toSend)) {
          written[k] = mergeValue(currentData[k], newVal, queue.baseFor(k, lastKnownCloudData.current[k]));
        }
        transaction.set(storeRef, written, { merge: true });
      })
        .then(() => {
          queue.sendSucceeded(written);
          setLastError(null);
          setSyncState('saved');
          if (queue.hasQueued()) flush(); // saved again while we were writing
        })
        .catch((e) => {
          console.error('Cloud sync failed — will retry:', e);
          queue.sendFailed();
          markFailure(e);
          if (!disposed) retryTimeout = setTimeout(flush, RETRY_MS);
        });
    };
    flushRef.current = flush;

    // Wrap setItem so every local save is also queued for the cloud.
    window.localStorage.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);

      // Let other components on the page update immediately.
      window.dispatchEvent(new Event('cloud_sync_update'));

      if (!key.startsWith(STORE_KEY_PREFIX)) return; // only sync app data

      let parsedValue: any = value;
      try { parsedValue = JSON.parse(value); } catch { /* keep raw string */ }

      queue.enqueue(key, parsedValue, lastKnownCloudData.current[key]);
      setSyncState(isOffline() ? 'offline' : 'saving');
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(flush, DEBOUNCE_MS);
    };

    // ---- 2. Cloud → local -------------------------------------------------
    const startupTimer = setTimeout(() => {
      // No answer from the cloud (offline / slow): open with local data.
      if (!disposed) {
        setLoading(false);
        if (isOffline()) setSyncState('offline');
      }
    }, STARTUP_TIMEOUT_MS);

    const unsubscribe = onSnapshot(
      storeRef,
      // true: we must also hear when cached data is confirmed by the server
      // (fromCache → false) even if nothing changed, to run the upload step.
      { includeMetadataChanges: true },
      (docSnap) => {
        const data: Record<string, any> = docSnap.exists() ? docSnap.data() : {};
        const fromServer = !docSnap.metadata.fromCache;

        const previousKnown = lastKnownCloudData.current;
        lastKnownCloudData.current = JSON.parse(JSON.stringify(data));
        setDocSizeBytes(approxSizeBytes(data));

        // One-time: upload data that exists only in this browser (e.g. from
        // before cloud sync existed, or logged while the database was locked).
        // Only against FRESH server data, and through the normal safe merge.
        if (fromServer && !initialUploadDone.current) {
          initialUploadDone.current = true;
          const unconfirmed = queue.unconfirmed();
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (!key || !key.startsWith(STORE_KEY_PREFIX) || key in unconfirmed) continue;
            try {
              const parsedLocal = JSON.parse(window.localStorage.getItem(key) || 'null');
              if (parsedLocal === null) continue;
              const cloudValue = data[key];
              if (cloudValue === undefined) {
                queue.enqueue(key, parsedLocal, undefined);
              } else if (Array.isArray(parsedLocal) && Array.isArray(cloudValue) && isIdObjectArray(parsedLocal, cloudValue)) {
                const cloudIds = new Set(cloudValue.map((it: any) => it?.id).filter(Boolean));
                const extras = parsedLocal.filter((it: any) => it && it.id && !cloudIds.has(it.id));
                if (extras.length > 0) {
                  console.log(`Uploading ${extras.length} browser-only item(s) for ${key}`);
                  queue.enqueue(key, [...cloudValue, ...extras], cloudValue);
                }
              }
            } catch { /* ignore unparseable local values */ }
          }
        }

        // Mirror into localStorage, keeping any not-yet-saved local changes on top.
        const unconfirmed = queue.unconfirmed();
        const keys = new Set([...Object.keys(data), ...Object.keys(unconfirmed)]);
        let changed = false;
        for (const key of keys) {
          if (!key.startsWith(STORE_KEY_PREFIX) && !(key in data)) continue;
          const shown = queue.overlay(key, data[key], previousKnown[key]);
          if (shown === undefined) continue;
          const stringified = JSON.stringify(shown);
          if (window.localStorage.getItem(key) !== stringified) {
            originalSetItem.call(window.localStorage, key, stringified);
            changed = true;
          }
        }
        if (changed) window.dispatchEvent(new Event('cloud_sync_update'));

        clearTimeout(startupTimer);
        setLoading(false);

        // Send anything waiting (from this visit, an earlier one, or the upload above).
        if (fromServer && queue.hasQueued()) flush();
      },
      (error) => {
        console.error('Error in store sync snapshot:', error);
        clearTimeout(startupTimer);
        markFailure(error);
        setLoading(false);
      },
    );

    // ---- 3. Connectivity & tab lifecycle ------------------------------------
    const onOnline = () => { setSyncState(queue.size ? 'saving' : 'idle'); flush(); };
    const onOffline = () => setSyncState('offline');
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      flush(); // last attempt; anything unsent stays in the durable queue
      disposed = true;
      unsubscribe();
      clearTimeout(syncTimeout);
      clearTimeout(retryTimeout);
      clearTimeout(startupTimer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      window.localStorage.setItem = originalSetItem;
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading your workspace...
      </div>
    );
  }

  return (
    <SyncStatusContext.Provider
      value={{ state: syncState, lastError, docSizeBytes, pendingCount, retryNow: () => flushRef.current() }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
}

/** Turn a Firestore error into a short message a non-developer can act on. */
function describeError(e: any): string {
  const code: string = e?.code || '';
  const message: string = e?.message || String(e);
  if (code === 'permission-denied') {
    return 'Permission denied. This account is not allowed to save data. Ask the admin to add it in Manage Users.';
  }
  if (code === 'unavailable' || /offline/i.test(message)) {
    return 'You appear to be offline. Changes are kept on this device and will be saved when you reconnect.';
  }
  if (/exceeds the maximum allowed size|too large|1048576|size/i.test(message)) {
    return 'The cloud storage document is full (1 MB limit). Download a backup and contact the developer.';
  }
  return message;
}
