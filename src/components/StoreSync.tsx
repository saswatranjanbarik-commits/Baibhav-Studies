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
 *     saving at once don't overwrite each other.
 *  4. A `cloud_sync_update` window event tells pages to re-read their data.
 *
 * SAFETY IMPROVEMENTS (vs. the original)
 *  - Pending saves are flushed immediately when the tab is hidden or closed,
 *    so a quick edit followed by closing the tab is no longer lost.
 *  - Failed saves are kept and retried automatically instead of being dropped.
 *  - The save status (saving / saved / error) and the document size are
 *    exposed through `useSyncStatus()` so the UI can warn the user.
 *
 * The merge rules and the data format are EXACTLY the same as before.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { STORE_COLLECTION, STORE_DOC_ID, STORE_KEY_PREFIX } from '../lib/storeKeys';

// ---------------------------------------------------------------------------
// Sync status shared with the rest of the app
// ---------------------------------------------------------------------------

export type SyncState = 'idle' | 'saving' | 'saved' | 'error';

export interface SyncStatus {
  state: SyncState;
  /** Human-readable reason for the last failure, if any. */
  lastError: string | null;
  /** Approximate size of the cloud document in bytes. */
  docSizeBytes: number;
  /** Retry any failed saves right now. */
  retryNow: () => void;
}

const SyncStatusContext = createContext<SyncStatus>({
  state: 'idle',
  lastError: null,
  docSizeBytes: 0,
  retryNow: () => {},
});

/** Read the current cloud-sync status from any component. */
export const useSyncStatus = () => useContext(SyncStatusContext);

// ---------------------------------------------------------------------------
// Merge helpers (logic unchanged from the original implementation)
// ---------------------------------------------------------------------------

/** True if either array contains objects that carry an `id`. */
function isIdObjectArray(a: any[], b: any[]): boolean {
  const hasId = (arr: any[]) =>
    arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'id' in arr[0];
  return hasId(a) || hasId(b);
}

/**
 * Merge one key's new local value with the value currently in the cloud.
 *  - Arrays of {id} objects: local edits win; items the user deleted are
 *    removed; items added elsewhere that this device never saw are kept.
 *  - Arrays of plain values: union.
 *  - Plain objects: shallow merge.
 *  - Anything else: the new value wins.
 */
function mergeValue(existingValue: any, newVal: any, lastKnownValue: any): any {
  if (existingValue === undefined) return newVal;

  if (Array.isArray(existingValue) && Array.isArray(newVal)) {
    if (!isIdObjectArray(newVal, existingValue)) {
      return Array.from(new Set([...existingValue, ...newVal]));
    }

    const lastKnownIds = new Set<string>();
    (Array.isArray(lastKnownValue) ? lastKnownValue : []).forEach((item: any) => {
      if (item && item.id) lastKnownIds.add(item.id);
    });

    const userNewMap = new Map<string, any>();
    newVal.forEach((item: any) => { if (item && item.id) userNewMap.set(item.id, item); });

    const mergedMap = new Map<string, any>();
    existingValue.forEach((item: any) => {
      if (!item || !item.id) return;
      if (userNewMap.has(item.id)) {
        mergedMap.set(item.id, userNewMap.get(item.id)); // user's version wins
      } else if (!lastKnownIds.has(item.id)) {
        mergedMap.set(item.id, item); // added elsewhere; user never saw it — keep
      }
      // else: user saw it and removed it — it's a deliberate delete
    });
    newVal.forEach((item: any) => {
      if (item && item.id && !mergedMap.has(item.id)) mergedMap.set(item.id, item);
    });
    return Array.from(mergedMap.values());
  }

  if (
    typeof existingValue === 'object' && existingValue !== null &&
    typeof newVal === 'object' && newVal !== null &&
    !Array.isArray(existingValue) && !Array.isArray(newVal)
  ) {
    return { ...existingValue, ...newVal };
  }

  return newVal;
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoreSync({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [docSizeBytes, setDocSizeBytes] = useState(0);
  const { currentUser } = useAuth();

  // What the cloud told us last — lets us tell a deliberate delete apart from
  // an item that another device added after we loaded.
  const lastKnownCloudData = useRef<Record<string, any>>({});
  // Whether the one-time "upload old local-only data" step has run.
  const initialUploadDone = useRef<boolean>(false);
  // Exposed so the UI's "Retry" button can trigger a flush.
  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    const originalSetItem = window.localStorage.setItem;
    const storeRef = doc(db, STORE_COLLECTION, STORE_DOC_ID);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // ---- 1. Cloud → local ---------------------------------------------------
    const unsubscribe = onSnapshot(storeRef, (docSnap) => {
      const data: Record<string, any> = docSnap.exists() ? docSnap.data() : {};

      lastKnownCloudData.current = JSON.parse(JSON.stringify(data));
      setDocSizeBytes(approxSizeBytes(data));

      // One-time migration: push any data that only exists in this browser's
      // localStorage (from before cloud sync existed) up to the cloud.
      if (!initialUploadDone.current) {
        const localUploads: Record<string, any> = {};

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (!key || !key.startsWith(STORE_KEY_PREFIX)) continue;
          const localValue = window.localStorage.getItem(key);
          if (!localValue) continue;

          try {
            const parsedLocal = JSON.parse(localValue);
            const cloudValue = data[key];

            if (cloudValue === undefined) {
              localUploads[key] = parsedLocal;
              data[key] = parsedLocal;
            } else if (Array.isArray(parsedLocal) && Array.isArray(cloudValue)) {
              if (isIdObjectArray(parsedLocal, cloudValue)) {
                // Add local items the cloud doesn't have yet.
                const cloudMap = new Map<string, any>();
                cloudValue.forEach((item: any) => { if (item && item.id) cloudMap.set(item.id, item); });
                let merged = false;
                parsedLocal.forEach((item: any) => {
                  if (item && item.id && !cloudMap.has(item.id)) {
                    cloudMap.set(item.id, item);
                    merged = true;
                  }
                });
                if (merged) {
                  localUploads[key] = Array.from(cloudMap.values());
                  data[key] = localUploads[key];
                }
              } else {
                const combined = Array.from(new Set([...cloudValue, ...parsedLocal]));
                if (combined.length > cloudValue.length) {
                  localUploads[key] = combined;
                  data[key] = combined;
                }
              }
            }
          } catch {
            // Ignore unparseable local values — never block loading.
          }
        }

        if (Object.keys(localUploads).length > 0) {
          console.log('Uploading local-only data to cloud…', Object.keys(localUploads));
          setDoc(storeRef, localUploads, { merge: true }).catch((e) => {
            console.error('Initial upload failed', e);
            setSyncState('error');
            setLastError(describeError(e));
          });
        }
        initialUploadDone.current = true;
      }

      // Mirror cloud values into localStorage (bypassing our wrapper so this
      // doesn't trigger another cloud write).
      let changed = false;
      for (const [key, value] of Object.entries(data)) {
        const stringified = JSON.stringify(value);
        if (window.localStorage.getItem(key) !== stringified) {
          originalSetItem.call(window.localStorage, key, stringified);
          changed = true;
        }
      }
      if (changed) window.dispatchEvent(new Event('cloud_sync_update'));

      setLoading(false);
    }, (error) => {
      console.error('Error in store sync snapshot:', error);
      setSyncState('error');
      setLastError(describeError(error));
      setLoading(false);
    });

    // ---- 2. Local → cloud ---------------------------------------------------
    let pendingUpdates: Record<string, any> = {};
    let syncTimeout: ReturnType<typeof setTimeout> | undefined;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let disposed = false; // set when the user logs out / component unmounts

    /** Write everything queued so far to Firestore. */
    const flush = () => {
      clearTimeout(syncTimeout);
      clearTimeout(retryTimeout);
      if (inFlight || Object.keys(pendingUpdates).length === 0) return;

      const updatesToPush = pendingUpdates;
      pendingUpdates = {};
      inFlight = true;
      setSyncState('saving');

      runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(storeRef);
        const currentData = docSnap.exists() ? docSnap.data() : {};
        const finalUpdates: Record<string, any> = {};
        for (const [k, newVal] of Object.entries(updatesToPush)) {
          finalUpdates[k] = mergeValue(currentData[k], newVal, lastKnownCloudData.current[k]);
        }
        transaction.set(storeRef, finalUpdates, { merge: true });
      })
        .then(() => {
          inFlight = false;
          setLastError(null);
          setSyncState('saved');
          // Anything saved while we were writing goes out next.
          if (Object.keys(pendingUpdates).length > 0) flush();
        })
        .catch((e) => {
          inFlight = false;
          console.error('Cloud sync failed — will retry:', e);
          // Put the failed updates back in the queue (unless the user has
          // saved a newer version of that key in the meantime).
          pendingUpdates = { ...updatesToPush, ...pendingUpdates };
          setSyncState('error');
          setLastError(describeError(e));
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

      pendingUpdates[key] = parsedValue;
      setSyncState('saving');
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(flush, DEBOUNCE_MS);
    };

    // Flush immediately when the tab is hidden or closed so nothing is lost.
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      flush(); // last attempt to save anything still queued
      disposed = true;
      unsubscribe();
      clearTimeout(syncTimeout);
      clearTimeout(retryTimeout);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      window.localStorage.setItem = originalSetItem;
    };
  }, [currentUser]);

  // Warn before closing the tab while a save is still pending or failing.
  useEffect(() => {
    if (syncState !== 'saving' && syncState !== 'error') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [syncState]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading your workspace...
      </div>
    );
  }

  return (
    <SyncStatusContext.Provider
      value={{ state: syncState, lastError, docSizeBytes, retryNow: () => flushRef.current() }}
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
