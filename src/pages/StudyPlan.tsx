import React, { useState, useEffect } from 'react';
import { PenTool, Plus, X, Search, Filter, Clock } from 'lucide-react';

type PlanType = 'Teaching' | 'Self Study' | 'Quiz' | 'Flashcard' | 'Task' | 'Assessment';

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
  timeFrom?: string;
  timeTo?: string;
  planType?: PlanType;
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
    startDate: new Date().toISOString().split('T')[0],
    planType: 'Self Study'
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
    if (!newEntry.subjectId || !newEntry.chapterId) return;

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
      status: newEntry.status || 'Pending',
      startDate: newEntry.startDate || new Date().toISOString().split('T')[0],
      timeFrom: newEntry.timeFrom,
      timeTo: newEntry.timeTo,
      planType: newEntry.planType || 'Self Study',
      weekNo: newEntry.weekNo || '1',
      learningIndex: newEntry.learningIndex || '1.1',
      doubts: newEntry.doubts || ''
    };

    saveEntries([entry, ...entries]);
    setShowAdd(false);
    setNewEntry({
      status: 'Pending',
      startDate: new Date().toISOString().split('T')[0],
      planType: 'Self Study'
    });
  };

  const toggleStatus = (id: string) => {
    const updated = entries.map(e => {
      if (e.id === id) {
        const next = e.status === 'Pending' ? 'In Progress' : e.status === 'In Progress' ? 'Completed' : 'Pending';
        return { ...e, status: next };
      }
      return e;
    });
    saveEntries(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this plan item?')) {
      saveEntries(entries.filter(e => e.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <PenTool className="h-6 w-6 text-indigo-600" /> Study Plan
          </h2>
          <p className="text-sm text-slate-500 mt-1">Create and manage your weekly and monthly study targets.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Plan Target
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject or topic..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 bg-white">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Target Details</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Index</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <p className="font-medium text-slate-600 mb-1">No items in your study plan yet.</p>
                    <p className="text-sm">Click "Add Plan Target" to get started.</p>
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm mb-1">{entry.subjectName} &middot; {entry.chapterName}</div>
                      <div className="text-xs font-medium text-indigo-600 mb-1">{entry.topicName}</div>
                      {entry.subTopicName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          {entry.subTopicName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-slate-700">{entry.startDate}</div>
                      {(entry.timeFrom || entry.timeTo) && (
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {entry.timeFrom} - {entry.timeTo}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">Week {entry.weekNo}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">
                        {entry.planType || 'Self Study'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">
                      {entry.learningIndex}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatus(entry.id)}
                        className={`inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full w-24 ${
                          entry.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          entry.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {entry.status}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(entry.id)} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-bold transition-colors">
                        Delete
                      </button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Add Plan Target</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic</label>
                  <select
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Plan Type</label>
                    <select
                      value={newEntry.planType || 'Self Study'}
                      onChange={e => setNewEntry({ ...newEntry, planType: e.target.value as PlanType })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Teaching">Teaching</option>
                      <option value="Self Study">Self Study</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Flashcard">Flashcard</option>
                      <option value="Task">Task</option>
                      <option value="Assessment">Assessment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Date</label>
                    <input
                      type="date"
                      required
                      value={newEntry.startDate || ''}
                      onChange={e => setNewEntry({ ...newEntry, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Time From (Optional)</label>
                    <input
                      type="time"
                      value={newEntry.timeFrom || ''}
                      onChange={e => setNewEntry({ ...newEntry, timeFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Time To (Optional)</label>
                    <input
                      type="time"
                      value={newEntry.timeTo || ''}
                      onChange={e => setNewEntry({ ...newEntry, timeTo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Week Number</label>
                    <input
                      type="number"
                      required
                      value={newEntry.weekNo || ''}
                      onChange={e => setNewEntry({ ...newEntry, weekNo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Learning Index</label>
                    <input
                      type="text"
                      required
                      value={newEntry.learningIndex || ''}
                      onChange={e => setNewEntry({ ...newEntry, learningIndex: e.target.value })}
                      placeholder="e.g. 1.1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
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
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
