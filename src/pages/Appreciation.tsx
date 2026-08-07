import React, { useState, useEffect } from 'react';
import { Star, Award, TrendingUp, ThumbsUp, Plus, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface AppreciationRecord {
  id: string;
  date: string;
  points: number;
  reason: string;
  teacherId: string;
  teacherName: string;
}

export default function Appreciation() {
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';
  const [records, setRecords] = useState<AppreciationRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  const [newRecord, setNewRecord] = useState<Partial<AppreciationRecord>>({
    points: 10,
    reason: ''
  });

  useEffect(() => {
    const load = () => {
    const saved = localStorage.getItem('dugu_appreciation');
    if (saved) setRecords(JSON.parse(saved));
      };
    load();
    window.addEventListener('cloud_sync_update', load);
    return () => window.removeEventListener('cloud_sync_update', load);
  }, []);

  const saveRecords = (newRecords: AppreciationRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('dugu_appreciation', JSON.stringify(newRecords));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.points || !newRecord.reason) return;

    const record: AppreciationRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      points: Number(newRecord.points),
      reason: newRecord.reason,
      teacherId: currentUser?.id || 'unknown',
      teacherName: currentUser?.username || 'Teacher'
    };

    saveRecords([record, ...records]);
    setShowAdd(false);
    setNewRecord({ points: 10, reason: '' });
  };

  const totalPoints = records.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" /> Appreciation & Points
          </h2>
          <p className="text-sm text-slate-500 mt-1">Track rewards and positive feedback for good work.</p>
        </div>
        {!isStudent && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Award Points
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-yellow-50">Total Points</h3>
            <Award className="h-6 w-6 text-yellow-200" />
          </div>
          <div>
            <div className="text-5xl font-black mb-1">{totalPoints}</div>
            <p className="text-yellow-100 text-sm font-medium">Earned this year</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700">Awards Given</h3>
            <ThumbsUp className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 mb-1">{records.length}</div>
            <p className="text-slate-500 text-sm font-medium">Total recognitions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700">Recent Trend</h3>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 mb-1">
              {records.filter(r => new Date(r.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).reduce((s, r) => s + r.points, 0)}
            </div>
            <p className="text-slate-500 text-sm font-medium">Points in last 30 days</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">Appreciation History</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {records.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No points awarded yet.
            </div>
          ) : (
            records.map(record => (
              <div key={record.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-yellow-700">+{record.points}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{record.reason}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {record.date} &middot; Awarded by {record.teacherName}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Award Points</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Points to Award *</label>
                  <select
                    required
                    value={newRecord.points}
                    onChange={e => setNewRecord({ ...newRecord, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white"
                  >
                    <option value={5}>5 Points - Good Effort</option>
                    <option value={10}>10 Points - Excellent Work</option>
                    <option value={20}>20 Points - Outstanding Achievement</option>
                    <option value={50}>50 Points - Milestone Reached</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Reason for Appreciation *</label>
                  <textarea
                    required
                    rows={3}
                    value={newRecord.reason}
                    onChange={e => setNewRecord({ ...newRecord, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none resize-none"
                    placeholder="e.g., Consistently completing homework on time..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg shadow-sm"
                >
                  Award Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
