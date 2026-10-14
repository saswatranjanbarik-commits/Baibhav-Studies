/**
 * SyncQueue — the list of changes waiting to be saved to the cloud.
 *
 * Why this exists: if the app is offline (or the tab is closed) before a save
 * reaches Firestore, the change must not be lost. The queue is written to this
 * browser's storage after every change and restored on the next visit.
 *
 * For each queued key we also remember the "base" — the cloud value this
 * device's edit started from. The merge uses it to tell "I deleted this item"
 * apart from "someone else added this item while I was offline".
 */
import { mergeValue } from './syncMerge';

interface Saved {
  queued: Record<string, any>;
  sending: Record<string, any>;
  bases: Record<string, any>;
}

const clone = (v: any) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export class SyncQueue {
  private queued: Record<string, any> = {};
  private sending: Record<string, any> = {};
  private bases: Record<string, any> = {};

  constructor(private persist: (json: string | null) => void, saved?: string | null) {
    if (!saved) return;
    try {
      const s = JSON.parse(saved) as Saved;
      // Anything that was mid-send when the page closed goes back in the queue.
      this.queued = { ...(s.sending || {}), ...(s.queued || {}) };
      this.bases = s.bases || {};
    } catch { /* corrupt → start empty */ }
  }

  /** Record a local change. `cloudValue` is what the cloud held when the edit began. */
  enqueue(key: string, value: any, cloudValue: any) {
    if (!(key in this.queued) && !(key in this.sending) && !(key in this.bases)) {
      this.bases[key] = clone(cloudValue);
    }
    this.queued[key] = value;
    this.save();
  }

  get size() { return Object.keys(this.queued).length + Object.keys(this.sending).length; }
  get isSending() { return Object.keys(this.sending).length > 0; }
  hasQueued() { return Object.keys(this.queued).length > 0; }

  /** Everything not yet confirmed by the cloud (newest wins). */
  unconfirmed(): Record<string, any> { return { ...this.sending, ...this.queued }; }

  baseFor(key: string, fallback: any) { return key in this.bases ? this.bases[key] : fallback; }

  /** Move queued changes to "sending" and return them. */
  takeForSend(): Record<string, any> {
    this.sending = this.queued;
    this.queued = {};
    this.save();
    return this.sending;
  }

  /** The cloud accepted `written` (the merged values actually stored). */
  sendSucceeded(written: Record<string, any>) {
    for (const k of Object.keys(this.sending)) {
      if (k in this.queued) {
        // Changed again meanwhile: its new base is what we just stored.
        this.bases[k] = clone(written[k]);
      } else {
        delete this.bases[k];
      }
    }
    this.sending = {};
    this.save();
  }

  /** The cloud refused or was unreachable: put the changes back (newer edits win). */
  sendFailed() {
    this.queued = { ...this.sending, ...this.queued };
    this.sending = {};
    this.save();
  }

  /**
   * What this device should SHOW for a key: the cloud value with any
   * unconfirmed local change merged on top (so offline edits stay visible).
   */
  overlay(key: string, cloudValue: any, lastKnownCloudValue: any): any {
    const pending = this.unconfirmed();
    if (!(key in pending)) return cloudValue;
    return mergeValue(cloudValue, pending[key], this.baseFor(key, lastKnownCloudValue));
  }

  private save() {
    this.persist(this.size > 0 ? JSON.stringify({ queued: this.queued, sending: this.sending, bases: this.bases }) : null);
  }
}
