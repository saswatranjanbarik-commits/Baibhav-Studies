import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { CheckCircle2, Globe2, BarChart3, Edit3, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { currentUser } = useAuth();
  
  const subjects = [
    { name: 'English', progress: 0, total: 11, pct: 0, color: 'bg-indigo-600' },
    { name: 'Hindi', progress: 3, total: 15, pct: 20, color: 'bg-purple-600' },
    { name: 'Odia', progress: 0, total: 12, pct: 0, color: 'bg-amber-700' },
    { name: 'Mathematics', progress: 0, total: 23, pct: 0, color: 'bg-teal-700' },
    { name: 'Science', progress: 0, total: 9, pct: 0, color: 'bg-green-700' },
    { name: 'Social Studies', progress: 0, total: 5, pct: 0, color: 'bg-orange-600' },
    { name: 'Computer Science', progress: 0, total: 8, pct: 0, color: 'bg-blue-800' },
    { name: 'Moral Science', progress: 0, total: 26, pct: 0, color: 'bg-purple-800' },
    { name: 'General Knowledge', progress: 0, total: 13, pct: 0, color: 'bg-slate-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <span className="text-2xl">👋</span> Welcome, {currentUser?.email?.split('@')[0] || 'Saswat'}!
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Exam Banner */}
      <div className="bg-[#1F4E79] rounded-xl p-4 text-white flex justify-between items-center mb-6 shadow-sm">
        <div>
          <div className="text-xs text-indigo-200 uppercase tracking-wider font-semibold mb-1">Next Exam</div>
          <div className="text-xl font-bold flex items-center gap-2">
            📝 Term-I
          </div>
          <div className="text-xs text-indigo-200 mt-1">2026-09-14</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black leading-none">43</div>
          <div className="text-xs text-indigo-200 mt-1 font-medium">days left</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-indigo-600">
          <div className="text-3xl font-black text-indigo-600">4</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Topics Logged</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-orange-600">
          <div className="text-3xl font-black text-orange-600">0</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Revisions Due</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-teal-700">
          <div className="text-3xl font-black text-teal-700">3%</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Overall Progress</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-purple-600">
          <div className="text-3xl font-black text-purple-600">0</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Pending Tasks</div>
        </div>
      </div>

      {/* Team Online */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
        <h3 className="text-[15px] font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-blue-500" /> Team Online Now
        </h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <div>
              <div className="text-sm font-bold text-slate-900">Saswat</div>
              <div className="text-xs text-slate-500">WAT +1 (West Africa)</div>
            </div>
          </div>
          <div className="text-sm font-bold text-indigo-600">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Progress */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-600" /> Subject Progress
          </h3>
          <div className="space-y-4">
            {subjects.map((sub) => (
              <div key={sub.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-700">{sub.name}</span>
                  <span className="text-slate-500">{sub.progress}/{sub.total} &middot; {sub.pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${sub.color} rounded-full`} 
                    style={{ width: `${sub.pct}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Revisions Due */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" /> Revisions Due Today
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-500">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">All clear!</p>
            </div>
          </div>

          {/* Recent Topics */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-500" /> Recent Topics
            </h3>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800">Hindi - Ch-7 Niti Ke Doha</div>
                    <div className="text-[11px] text-slate-500">Doha- {i === 1 ? 'Rahim' : i === 2 ? 'Kabir' : 'Rahim'}</div>
                  </div>
                  <div className="text-[10px] text-slate-400">2026-07-29</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
