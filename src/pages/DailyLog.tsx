import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Search, Filter, Calendar, Clock, BookOpen, RefreshCw, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface DailyLogEntry {
  id: string;
  date: string;
  period?: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  subTopicId?: string;
  subTopicName?: string;
  status: 'In Progress' | 'Completed' | 'Have Doubt';
  notes: string;
}

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

export default function DailyLog() {
  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // Data sources
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [newLog, setNewLog] = useState<Partial<DailyLogEntry>>({
    status: 'In Progress',
    date: new Date().toISOString().split('T')[0],
    period: 'Period 1'
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));

    const savedLogs = localStorage.getItem('dugu_daily_logs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));

    const savedPlan = localStorage.getItem('dugu_study_plan');
    if (savedPlan) setStudyPlan(JSON.parse(savedPlan));

    const savedTimetable = localStorage.getItem('dugu_timetable');
    if (savedTimetable) setTimetable(JSON.parse(savedTimetable));

    const savedRevisions = localStorage.getItem('dugu_revisions');
    if (savedRevisions) setRevisions(JSON.parse(savedRevisions));
  }, []);

  // Autofill subject from timetable when date or period changes
  useEffect(() => {
    if (newLog.date && newLog.period && !selectedPlanId) {
      const dayOfWeek = new Date(newLog.date).toLocaleDateString('en-US', { weekday: 'long' });
      const entry = timetable.find((e: any) => e.day === dayOfWeek && e.period === newLog.period);
      if (entry && entry.subjectId !== newLog.subjectId) {
        setNewLog(prev => ({ ...prev, subjectId: entry.subjectId, chapterId: '', topicId: '', subTopicId: '' }));
      }
    }
  }, [newLog.date, newLog.period, selectedPlanId, timetable]);

  const saveLogs = (newLogs: DailyLogEntry[]) => {
    setLogs(newLogs);
    localStorage.setItem('dugu_daily_logs', JSON.stringify(newLogs));
  };

  const scheduleRevisions = (log: DailyLogEntry) => {
    const savedRevisions = localStorage.getItem('dugu_revisions');
    let savedRevs: RevisionEntry[] = savedRevisions ? JSON.parse(savedRevisions) : [];
    
    const logDate = new Date(log.date);
    
    const createRevision = (days: number, type: '7 Day' | '15 Day' | '30 Day'): RevisionEntry => {
      const scheduledDate = new Date(logDate);
      scheduledDate.setDate(scheduledDate.getDate() + days);
      
      return {
        id: Date.now().toString() + '-' + days,
        logId: log.id,
        dateScheduled: scheduledDate.toISOString().split('T')[0],
        type,
        subjectName: log.subjectName,
        chapterName: log.chapterName,
        topicName: log.topicName,
        subTopicName: log.subTopicName,
        status: 'Pending'
      };
    };

    savedRevs.push(createRevision(7, '7 Day'));
    savedRevs.push(createRevision(15, '15 Day'));
    savedRevs.push(createRevision(30, '30 Day'));

    setRevisions(savedRevs);
    localStorage.setItem('dugu_revisions', JSON.stringify(savedRevs));
  };

  const activeSubject = syllabus.find(s => s.id === newLog.subjectId);
  const activeChapter = activeSubject?.chapters?.find((c: any) => c.id === newLog.chapterId);
  const activeTopic = activeChapter?.topics?.find((t: any) => t.id === newLog.topicId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.subjectId || !newLog.chapterId || !newLog.topicId || !newLog.date) return;

    const log: DailyLogEntry = {
      id: Date.now().toString(),
      date: newLog.date,
      period: newLog.period || 'Period 1',
      subjectId: newLog.subjectId,
      subjectName: activeSubject?.name || '',
      chapterId: newLog.chapterId,
      chapterName: activeChapter?.name || '',
      topicId: newLog.topicId,
      topicName: activeTopic?.name || '',
      subTopicId: newLog.subTopicId,
      subTopicName: activeTopic?.subTopics?.find((st: any) => st.id === newLog.subTopicId)?.name || '',
      status: (newLog.status as any) || 'In Progress',
      notes: newLog.notes || ''
    };

    saveLogs([log, ...logs]);
    
    // Auto-schedule revisions when a log is created
    scheduleRevisions(log);

    // If it was linked to a revision, we might want to mark it done
    if (newLog.notes?.startsWith('Revision:')) {
       // Optional: we could find the revision and mark it completed if we passed the rev ID
    }

    setShowAdd(false);
    setSelectedPlanId('');
    setNewLog({
      status: 'In Progress',
      date: selectedDate,
      period: 'Period 1'
    });
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    if (!planId) return;
    
    const plan = studyPlan.find(p => p.id === planId);
    if (plan) {
      setNewLog(prev => ({
        ...prev,
        subjectId: plan.subjectId,
        chapterId: plan.chapterId,
        topicId: plan.topicId,
        subTopicId: plan.subTopicId || ''
      }));
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Have Doubt': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSubjectName = (subjectId: string) => {
    const s = syllabus.find(s => s.id === subjectId);
    return s ? s.name : '';
  };

  // Dashboard Data
  const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
  const todaysTimetable = timetable.filter(t => t.day === dayOfWeek).sort((a, b) => a.period.localeCompare(b.period));
  const todaysRevisions = revisions.filter(r => r.dateScheduled === selectedDate && r.status === 'Pending');
  const pendingStudyPlan = studyPlan.filter(p => p.status !== 'Completed').slice(0, 5); // Show top 5 pending
  const logsForDate = logs.filter(l => l.date === selectedDate);

  const handleTimetableClick = (entry: any) => {
    setNewLog({
      status: 'In Progress',
      date: selectedDate,
      period: entry.period,
      subjectId: entry.subjectId,
      chapterId: '',
      topicId: '',
      subTopicId: ''
    });
    setSelectedPlanId('');
    setShowAdd(true);
  };

  const handlePlanClick = (plan: any) => {
    setNewLog({
      status: 'In Progress',
      date: selectedDate,
      period: 'Period 1',
      subjectId: plan.subjectId,
      chapterId: plan.chapterId,
      topicId: plan.topicId,
      subTopicId: plan.subTopicId || ''
    });
    setSelectedPlanId(plan.id);
    setShowAdd(true);
  };

  const handleRevisionClick = (rev: RevisionEntry) => {
    let subjectId = '';
    let chapterId = '';
    let topicId = '';
    let subTopicId = '';
    
    const subject = syllabus.find(s => s.name === rev.subjectName);
    if (subject) {
      subjectId = subject.id;
      const chapter = subject.chapters?.find((c: any) => c.name === rev.chapterName);
      if (chapter) {
        chapterId = chapter.id;
        const topic = chapter.topics?.find((t: any) => t.name === rev.topicName);
        if (topic) {
          topicId = topic.id;
          const subTopic = topic.subTopics?.find((st: any) => st.name === rev.subTopicName);
          if (subTopic) subTopicId = subTopic.id;
        }
      }
    }

    setNewLog({
      status: 'In Progress',
      date: selectedDate,
      period: 'Period 1',
      subjectId,
      chapterId,
      topicId,
      subTopicId,
      notes: `Revision: ${rev.type}`
    });
    setSelectedPlanId('');
    setShowAdd(true);
  };

  const formattedDateTime = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-indigo-600" /> Daily Log
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-200 w-fit">
              <Clock className="h-3.5 w-3.5" /> {formattedDateTime}
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-2 sm:mt-1">Manage your daily study sessions and revisions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-3 font-semibold text-sm text-slate-700 flex items-center gap-2 min-w-[140px] justify-center">
              <Calendar className="h-4 w-4 text-slate-400" />
              {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
            </div>
            <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setNewLog({ status: 'In Progress', date: selectedDate, period: 'Period 1' });
              setSelectedPlanId('');
              setShowAdd(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Add Log
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Timetable Column */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800">School Timetable</h3>
            <span className="ml-auto text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{dayOfWeek}</span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[300px]">
            {!todaysTimetable.length ? (
              <div className="p-4 text-center text-sm text-slate-500">No timetable configured for {dayOfWeek}.</div>
            ) : (
              <div className="space-y-1">
                {todaysTimetable.map(entry => (
                  <button 
                    key={entry.id}
                    onClick={() => handleTimetableClick(entry)}
                    className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 mb-0.5">{entry.period}</div>
                      <div className="text-sm font-semibold text-slate-800">{getSubjectName(entry.subjectId)}</div>
                    </div>
                    <Plus className="h-4 w-4 text-slate-300 group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Study Plan Column */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800">Study Plan</h3>
            <span className="ml-auto text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{pendingStudyPlan.length} Pending</span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[300px]">
            {!pendingStudyPlan.length ? (
              <div className="p-4 text-center text-sm text-slate-500">No pending items in the Study Plan.</div>
            ) : (
              <div className="space-y-1">
                {pendingStudyPlan.map(plan => (
                  <button 
                    key={plan.id}
                    onClick={() => handlePlanClick(plan)}
                    className="w-full text-left p-3 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-600 uppercase tracking-wider mb-1">
                        {plan.subjectName} &gt; {plan.chapterName}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 line-clamp-1">{plan.topicName}</div>
                      {plan.subTopicName && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{plan.subTopicName}</div>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Revisions Column */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-800">Scheduled Revisions</h3>
            <span className="ml-auto text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Due Today</span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[300px]">
            {!todaysRevisions.length ? (
              <div className="p-4 text-center text-sm text-slate-500">No revisions scheduled for this date.</div>
            ) : (
              <div className="space-y-1">
                {todaysRevisions.map(rev => (
                  <button 
                    key={rev.id}
                    onClick={() => handleRevisionClick(rev)}
                    className="w-full text-left p-3 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100 flex flex-col group"
                  >
                    <div className="flex justify-between items-start mb-1 w-full">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${rev.type === '7 Day' ? 'text-blue-600 bg-blue-50 border-blue-200' : rev.type === '15 Day' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-purple-600 bg-purple-50 border-purple-200'}`}>
                         {rev.type}
                       </span>
                       <Plus className="h-4 w-4 text-slate-300 group-hover:text-amber-500 flex-shrink-0" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 group-hover:text-amber-600 uppercase tracking-wider mb-1 mt-1">
                        {rev.subjectName} &gt; {rev.chapterName}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 line-clamp-1">{rev.topicName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Logs for {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
        </h3>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap w-24">Period</th>
                <th className="p-4 whitespace-nowrap">Topic Info</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4">Notes / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!logsForDate.length ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    No daily logs found for this date. Click an item above to log it.
                  </td>
                </tr>
              ) : (
                logsForDate.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-900">{log.period}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {log.subjectName} &middot; {log.chapterName}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{log.topicName}</div>
                      {log.subTopicName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <div className="w-1 h-1 rounded-full bg-slate-400"></div> {log.subTopicName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs">
                      {log.notes ? log.notes : '-'}
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
              <h3 className="text-lg font-bold text-slate-900">Add Daily Log</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">
                <div className="sm:col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Topic Taught</h4>
                  
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <label className="block text-sm font-bold text-indigo-900 mb-1.5">Quick Load from Study Plan</label>
                    <select
                      value={selectedPlanId}
                      onChange={e => handlePlanSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                    >
                      <option value="">-- Select an item from Study Plan --</option>
                      {studyPlan.filter(p => p.status !== 'Completed').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.subjectName} &gt; {p.chapterName} &gt; {p.topicName} {p.subTopicName ? `> ${p.subTopicName}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject *</label>
                  <select
                    required
                    value={newLog.subjectId || ''}
                    onChange={e => setNewLog({ ...newLog, subjectId: e.target.value, chapterId: '', topicId: '', subTopicId: '' })}
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
                    value={newLog.chapterId || ''}
                    onChange={e => setNewLog({ ...newLog, chapterId: e.target.value, topicId: '', subTopicId: '' })}
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
                    value={newLog.topicId || ''}
                    onChange={e => setNewLog({ ...newLog, topicId: e.target.value, subTopicId: '' })}
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
                    value={newLog.subTopicId || ''}
                    onChange={e => setNewLog({ ...newLog, subTopicId: e.target.value })}
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    value={newLog.date || ''}
                    onChange={e => setNewLog({...newLog, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Period</label>
                  <select
                    value={newLog.period || 'Period 1'}
                    onChange={e => setNewLog({...newLog, period: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    {[1,2,3,4,5,6,7,8].map(p => (
                      <option key={p} value={`Period ${p}`}>Period {p}</option>
                    ))}
                    <option value="Extra Class">Extra Class</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Status *</label>
                  <select
                    required
                    value={newLog.status || 'In Progress'}
                    onChange={e => setNewLog({...newLog, status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Have Doubt">Have Doubt</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={newLog.notes || ''}
                    onChange={e => setNewLog({...newLog, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Enter notes about the session..."
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
                  Save Daily Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
