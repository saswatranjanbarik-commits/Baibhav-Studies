/**
 * Small UI pieces that show the cloud-save status.
 *
 *  - <SyncBadge />  : the pill in the header (Saved / Saving… / Not saved)
 *  - <SyncBanner /> : a full-width warning shown when saving fails, or (for
 *                     the admin) when cloud storage is getting full.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useSyncStatus } from './StoreSync';
import { useAuth } from '../lib/AuthContext';
import { FIRESTORE_DOC_LIMIT_BYTES, STORE_SIZE_WARNING_RATIO } from '../config/app';

export function SyncBadge() {
  const { state } = useSyncStatus();

  const styles: Record<string, { text: string; dot: string; label: string }> = {
    idle:   { text: 'bg-green-500/20 text-green-300', dot: 'bg-green-400', label: 'online' },
    saved:  { text: 'bg-green-500/20 text-green-300', dot: 'bg-green-400', label: 'saved' },
    saving: { text: 'bg-amber-500/20 text-amber-200', dot: 'bg-amber-300 animate-pulse', label: 'saving…' },
    error:  { text: 'bg-red-500/30 text-red-100', dot: 'bg-red-400', label: 'not saved' },
  };
  const s = styles[state];

  return (
    <span className={`text-[10px] ${s.text} px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2 flex items-center gap-1`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      <span className="hidden sm:inline">{s.label}</span>
    </span>
  );
}

export function SyncBanner() {
  const { state, lastError, docSizeBytes, retryNow } = useSyncStatus();
  const { currentUser } = useAuth();
  const nearlyFull = docSizeBytes / FIRESTORE_DOC_LIMIT_BYTES >= STORE_SIZE_WARNING_RATIO;

  if (state === 'error') {
    return (
      <div className="bg-red-50 border-b border-red-200 text-red-800 text-sm px-4 py-2 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <strong>Your latest changes are not saved to the cloud yet.</strong>{' '}
          {lastError} Keep this tab open; it retries automatically.
        </span>
        <button
          onClick={retryNow}
          className="inline-flex items-center gap-1 font-semibold bg-white border border-red-300 rounded px-2 py-1 hover:bg-red-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (nearlyFull && currentUser?.role === 'Admin') {
    return (
      <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          Cloud storage is {Math.round((docSizeBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100)}% full.{' '}
          <Link to="/backup" className="underline font-semibold">Download a backup</Link> and plan to split the data.
        </span>
      </div>
    );
  }

  return null;
}
