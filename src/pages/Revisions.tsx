import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Filter, CheckCircle } from 'lucide-react';

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
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);

  useEffect(() => {
    const load = () => {
    const saved = localStorage.getItem('dugu_revisions');
    if (saved) {
      // Sort by scheduled date ascending
      const parsed: RevisionEntry[] = JSON.parse(saved);
      parsed.sort((a, b) => new Date(a.dateScheduled).getTime() - new Date(b.dateScheduled).getTime());
      setRevisions(parsed);
    }
      };
    load();
    window.addEventListener('cloud_sync_update', load);
    return () => window.removeEventListener('cloud_sync_update', load);
  }, []);

  const markCompleted = (id: string) => {
    const updated = revisions.map(r => r.id === id ? { ...r, status: 'Completed' as const } : r);
    setRevisions(updated);
    localStorage.setItem('dugu_revisions', JSON.stringify(updated));
  };

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
    return new Date(date).getTime() < new Date().setHours(0,0,0,0);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-blue-500" /> Revision Planner
        </h2>
        <p className="text-sm text-slate-500 mt-1">7-day, 15-day, and 30-day revision cycles - auto-scheduled from Daily Logs.</p>
      </div>

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
                    No revisions scheduled yet. Add items in the Daily Log to auto-schedule them.
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
