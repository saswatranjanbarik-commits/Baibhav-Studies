import React, { useState, useEffect } from 'react';
import { PenTool, Plus, X, Search, Filter } from 'lucide-react';

interface StudyPlanEntry {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  subTopicId?: string;
  subTopicName?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  startDate: string;
  weekNo: string;
  learningIndex: string;
  doubts: string;
}

export default function StudyPlan() {
  const [entries, setEntries] = useState<StudyPlanEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // Syllabus data to populate dropdowns
  const [syllabus, setSyllabus] = useState<any[]>([]);

  const [newEntry, setNewEntry] = useState<Partial<StudyPlanEntry>>({
    status: 'Pending',
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));

    const savedEntries = localStorage.getItem('dugu_study_plan');
    if (savedEntries) setEntries(JSON.parse(savedEntries));
  }, []);

  const saveEntries = (newEntries: StudyPlanEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('dugu_study_plan', JSON.stringify(newEntries));
  };

  const activeSubject = syllabus.find(s => s.id === newEntry.subjectId);
  const activeChapter = activeSubject?.chapters?.find((c: any) => c.id === newEntry.chapterId);
  const activeTopic = activeChapter?.topics?.find((t: any) => t.id === newEntry.topicId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.subjectId || !newEntry.chapterId || !newEntry.topicId) return;

    const entry: StudyPlanEntry = {
      id: Date.now().toString(),
      subjectId: newEntry.subjectId,
      subjectName: activeSubject?.name || '',
      chapterId: newEntry.chapterId,
      chapterName: activeChapter?.name || '',
      topicId: newEntry.topicId,
      topicName: activeTopic?.name || '',
      subTopicId: newEntry.subTopicId,
      subTopicName: activeTopic?.subTopics?.find((st: any) => st.id === newEntry.subTopicId)?.name || '',
      status: (newEntry.status as any) || 'Pending',
      startDate: newEntry.startDate || '',
      weekNo: newEntry.weekNo || '',
      learningIndex: newEntry.learningIndex || '',
      doubts: newEntry.doubts || ''
    };

    saveEntries([entry, ...entries]);
    setShowAdd(false);
    setNewEntry({
      status: 'Pending',
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <PenTool className="h-6 w-6 text-slate-600" /> Study Plan
          </h2>
          <p className="text-sm text-slate-500 mt-1">Track learning progress, index, and doubts for your syllabus topics.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add to Study Plan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search plan..." 
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
                <th className="p-4 whitespace-nowrap">Topic Info</th>
                <th className="p-4 whitespace-nowrap">Week No</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 whitespace-nowrap">Learning Index</th>
                <th className="p-4">Doubts / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!entries.length ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    No items in Study Plan yet. Click "Add to Study Plan" to get started.
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {entry.subjectName} &middot; {entry.chapterName}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{entry.topicName}</div>
                      {entry.subTopicName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <div className="w-1 h-1 rounded-full bg-slate-400"></div> {entry.subTopicName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-slate-700">{entry.weekNo || '-'}</div>
                      <div className="text-[10px] text-slate-400">{entry.startDate}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700">{entry.learningIndex || '-'}</td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs">
                      {entry.doubts ? (
                        <span className="text-orange-600 font-medium flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span className="truncate" title={entry.doubts}>{entry.doubts}</span>
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Add to Study Plan</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">
                <div className="sm:col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Topic Selection</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject *</label>
                  <select
                    required
                    value={newEntry.subjectId || ''}
                    onChange={e => setNewEntry({ ...newEntry, subjectId: e.target.value, chapterId: '', topicId: '', subTopicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select Subject...</option>
                    {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Chapter *</label>
                  <select
                    required
                    disabled={!activeSubject}
                    value={newEntry.chapterId || ''}
                    onChange={e => setNewEntry({ ...newEntry, chapterId: e.target.value, topicId: '', subTopicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Chapter...</option>
                    {activeSubject?.chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic *</label>
                  <select
                    required
                    disabled={!activeChapter}
                    value={newEntry.topicId || ''}
                    onChange={e => setNewEntry({ ...newEntry, topicId: e.target.value, subTopicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Topic...</option>
                    {activeChapter?.topics?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Sub-topic (Optional)</label>
                  <select
                    disabled={!activeTopic || !activeTopic.subTopics?.length}
                    value={newEntry.subTopicId || ''}
                    onChange={e => setNewEntry({ ...newEntry, subTopicId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Sub-topic...</option>
                    {activeTopic?.subTopics?.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Progress Details</h4>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                  <select
                    value={newEntry.status || 'Pending'}
                    onChange={e => setNewEntry({...newEntry, status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={newEntry.startDate || ''}
                    onChange={e => setNewEntry({...newEntry, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Lesson Plan Week No</label>
                  <input
                    type="text"
                    value={newEntry.weekNo || ''}
                    onChange={e => setNewEntry({...newEntry, weekNo: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Week 4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Learning Index</label>
                  <input
                    type="text"
                    value={newEntry.learningIndex || ''}
                    onChange={e => setNewEntry({...newEntry, learningIndex: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 85%"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Doubts / Notes</label>
                  <textarea
                    rows={2}
                    value={newEntry.doubts || ''}
                    onChange={e => setNewEntry({...newEntry, doubts: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Record any specific doubts or observations here..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Study Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
