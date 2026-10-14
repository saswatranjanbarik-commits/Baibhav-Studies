import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Filter, CheckCircle, RotateCcw, X, Archive } from 'lucide-react';
import { parseDateStr, addDays, todayStr } from '../lib/dates';
import { useAuth } from '../lib/AuthContext';
import { STORE_KEYS, readStore } from '../lib/storeKeys';
import {
  RevisionSettings, loadRevisionSettings, isCurrentRevision, tidyStaleRevisions,
  performFreshStart, restoreArchivedRevisions, loadArchive,
} from '../lib/revisionReset';

interface RevisionEntry {
  id: string;
  logId: string;
  dateScheduled: string;
  type: '7 Day' | '15 Day' | '30 Day';
  subjectName: string;
  chapterName: string;
  topicName: string;
  subTopicName?: string;
  status: 'Pending' | 'Completed';
}

export default function Revisions() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [settings, setSettings] = useState<RevisionSettings | null>(null);
  const [archivedCount, setArchivedCount] = useState(0);
  const [showFreshStart, setShowFreshStart] = useState(false);
  const [freshFrom, setFreshFrom] = useState(addDays(todayStr(), 1));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const s = loadRevisionSettings();
      setSettings(s);
      setArchivedCount(loadArchive().reduce((n, b) => n + b.items.length, 0));
      // Only revisions from the current plan (after any fresh start), soonest first.
      const all = readStore<RevisionEntry[]>(STORE_KEYS.revisions, []);
      const current = all.filter((r) => isCurrentRevision(r, s));
      current.sort((a, b) => a.dateScheduled.localeCompare(b.dateScheduled));
      setRevisions(current);
    };
    // Put back into the archive any old revisions a stale device re-uploaded.
    tidyStaleRevisions();
    load();
    window.addEventListener('cloud_sync_update', load);
    return () => window.removeEventListener('cloud_sync_update', load);
  }, []);

  const markCompleted = (id: string) => {
    // Update the FULL saved list (not just the visible one) so nothing else is touched.
    const all = readStore<RevisionEntry[]>(STORE_KEYS.revisions, []);
    const updated = all.map(r => r.id === id ? { ...r, status: 'Completed' as const } : r);
    localStorage.setItem(STORE_KEYS.revisions, JSON.stringify(updated));
  };

  const handleFreshStart = () => {
    const n = performFreshStart(freshFrom, currentUser?.email);
    setShowFreshStart(false);
    setNotice(`Fresh start set from ${parseDateStr(freshFrom).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}. ${n} old revision${n === 1 ? '' : 's'} archived (a backup file was also downloaded).`);
  };

  const handleRestore = () => {
    if (!confirm('Bring back all archived revisions and turn off the fresh start?')) return;
    const n = restoreArchivedRevisions();
    setNotice(`${n} archived revision${n === 1 ? '' : 's'} restored.`);
  };

  const pendingNow = revisions.filter(r => r.status !== 'Completed').length;

  const getStatusColor = (status: string) => {
    return status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '7 Day': return 'text-blue-600 bg-blue-50 border-blue-200';
      case '15 Day': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case '30 Day': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const isOverdue = (date: string, status: string) => {
    if (status === 'Completed') return false;
    return parseDateStr(date).getTime() < new Date().setHours(0,0,0,0);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-blue-500" /> Revision Planner
        </h2>
        <p className="text-sm text-slate-500 mt-1">7-day, 15-day, and 30-day revision cycles - auto-scheduled from Daily Logs.</p>
      </div>

      {/* Fresh start (v1.3) */}
      {notice && (
        <div className="mb-4 p-3 rounded-lg border bg-green-50 border-green-200 text-green-800 text-sm flex items-start gap-2">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}
      {settings && (
        <div className="mb-4 p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-900 text-sm flex flex-col sm:flex-row sm:items-center gap-2">
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            <strong>Fresh start from {parseDateStr(settings.freshStartFrom).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}.</strong>{' '}
            Revisions are created only for study logged from that day.
            {archivedCount > 0 && <> {archivedCount} earlier revision{archivedCount === 1 ? ' is' : 's are'} kept in the archive.</>}
          </span>
          {isAdmin && archivedCount > 0 && (
            <button onClick={handleRestore} className="self-start sm:self-auto text-xs font-semibold bg-white border border-blue-300 hover:bg-blue-100 rounded px-2 py-1 inline-flex items-center gap-1">
              <Archive className="h-3.5 w-3.5" /> Restore archived
            </button>
          )}
        </div>
      )}
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => { setFreshFrom(addDays(todayStr(), 1)); setShowFreshStart(true); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg px-3 py-2"
          >
            <RotateCcw className="h-4 w-4" /> Fresh start…
          </button>
        </div>
      )}
      {showFreshStart && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><RotateCcw className="h-5 w-5 text-blue-600" /> Fresh start</h3>
              <button onClick={() => setShowFreshStart(false)} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <ul className="text-sm text-slate-600 space-y-1.5 mb-4 list-disc pl-5">
              <li>All <strong>{revisions.length}</strong> current revisions ({pendingNow} pending) move to the <strong>archive</strong> — nothing is deleted, and you can restore them.</li>
              <li>A backup file of them is downloaded to this computer first.</li>
              <li>New revisions are created only for study logged <strong>on or after</strong> the date below.</li>
              <li>Daily logs, study plan and everything else stay exactly as they are.</li>
            </ul>
            <label className="block text-sm font-bold text-slate-700 mb-1">Start fresh from</label>
            <input
              type="date"
              value={freshFrom}
              min={todayStr()}
              onChange={(e) => setFreshFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white mb-5"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFreshStart(false)} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleFreshStart} disabled={!freshFrom} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                Archive &amp; start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search revisions..." 
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 bg-white"
              />
            </div>
            <button className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap">Due Date</th>
                <th className="p-4 whitespace-nowrap">Topic Info</th>
                <th className="p-4 whitespace-nowrap">Cycle</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!revisions.length ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    {settings ? `No revisions yet — they'll appear as study is logged from ${parseDateStr(settings.freshStartFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.` : 'No revisions scheduled yet. Add items in the Daily Log to auto-schedule them.'}
                  </td>
                </tr>
              ) : (
                revisions.map(rev => (
                  <tr key={rev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className={`text-sm font-bold ${isOverdue(rev.dateScheduled, rev.status) ? 'text-red-600' : 'text-slate-900'}`}>
                        {rev.dateScheduled}
                      </div>
                      {isOverdue(rev.dateScheduled, rev.status) && (
                        <div className="text-[10px] font-bold text-red-500 uppercase mt-0.5">Overdue</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {rev.subjectName} &middot; {rev.chapterName}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{rev.topicName}</div>
                      {rev.subTopicName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <div className="w-1 h-1 rounded-full bg-slate-400"></div> {rev.subTopicName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${getTypeColor(rev.type)}`}>
                        {rev.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${getStatusColor(rev.status)}`}>
                        {rev.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {rev.status === 'Pending' && (
                        <button
                          onClick={() => markCompleted(rev.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Mark Done
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
