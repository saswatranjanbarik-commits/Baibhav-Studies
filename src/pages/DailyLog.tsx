import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Search, Filter, Calendar, Clock, BookOpen, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, Activity, Gamepad2, UserCircle, Users, Trash2, GraduationCap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

type LogType = 'School' | 'Tutor' | 'Self Study' | 'Play' | 'Activity';
type Category = 'Rock' | 'Sand' | 'Pebble';

interface DailyLogEntry {
  id: string;
  date: string;
  logType?: LogType;
  category?: Category;
  timeFrom?: string;
  timeTo?: string;
  
  // Backwards compat / Rock
  period?: string;
  subjectId?: string;
  subjectName?: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  subTopicId?: string;
  subTopicName?: string;
  status?: 'In Progress' | 'Completed' | 'Have Doubt';
  
  // Sand / Pebble
  activityDetail?: string;
  
  notes?: string;
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
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';
  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  
  const [newLog, setNewLog] = useState<Partial<DailyLogEntry>>({
    logType: 'Self Study',
    category: 'Rock',
    date: new Date().toISOString().split('T')[0],
    status: 'In Progress'
  });

  const [activeDate, setActiveDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  const saveLogs = (newLogs: DailyLogEntry[]) => {
    setLogs(newLogs);
    localStorage.setItem('dugu_daily_logs', JSON.stringify(newLogs));
  };

  const scheduleRevisions = (log: DailyLogEntry) => {
    if (log.category !== 'Rock') return; // Only Rock logs need revisions
    const savedRevisions = localStorage.getItem('dugu_revisions');
    let savedRevs: RevisionEntry[] = savedRevisions ? JSON.parse(savedRevisions) : [];
    
    const logDate = new Date(log.date);
    
    const createRevision = (days: number, type: '7 Day' | '15 Day' | '30 Day'): RevisionEntry => {
      const d = new Date(logDate);
      d.setDate(d.getDate() + days);
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        logId: log.id,
        dateScheduled: d.toISOString().split('T')[0],
        type,
        subjectName: log.subjectName || '',
        chapterName: log.chapterName || '',
        topicName: log.topicName || '',
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

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    if (!planId) return;
    
    const planItem = studyPlan.find(p => p.id === planId);
    if (planItem) {
      setNewLog(prev => ({
        ...prev,
        subjectId: planItem.subjectId,
        chapterId: planItem.chapterId,
        topicId: planItem.topicId,
        subTopicId: planItem.subTopicId || '',
        logType: 'Self Study',
        category: 'Rock'
      }));
    }
  };

  const handleLogTypeChange = (type: LogType) => {
    let category: Category = 'Rock';
    if (type === 'Play') category = 'Sand';
    if (type === 'Activity') category = 'Pebble';
    setNewLog(prev => ({ ...prev, logType: type, category, activityDetail: '' }));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    const log: DailyLogEntry = {
      id: Date.now().toString(),
      date: newLog.date || new Date().toISOString().split('T')[0],
      logType: newLog.logType || 'Self Study',
      category: newLog.category || 'Rock',
      timeFrom: newLog.timeFrom,
      timeTo: newLog.timeTo,
      period: newLog.period,
      notes: newLog.notes || ''
    };

    if (log.category === 'Rock') {
      if (!newLog.subjectId || !newLog.chapterId) {
        alert("Please select Subject and Chapter");
        return;
      }
      log.subjectId = newLog.subjectId;
      log.subjectName = activeSubject?.name || '';
      log.chapterId = newLog.chapterId;
      log.chapterName = activeChapter?.name || '';
      log.topicId = newLog.topicId;
      log.topicName = activeTopic?.name || '';
      log.subTopicId = newLog.subTopicId;
      log.subTopicName = activeTopic?.subTopics?.find((st: any) => st.id === newLog.subTopicId)?.name || '';
      log.status = (newLog.status as any) || 'In Progress';
    } else {
      if (!newLog.activityDetail) {
        alert("Please select activity details");
        return;
      }
      log.activityDetail = newLog.activityDetail;
    }

    saveLogs([log, ...logs]);
    
    if (log.category === 'Rock') {
      scheduleRevisions(log);
    }
    
    setShowAdd(false);
    setNewLog({ 
      logType: 'Self Study', 
      category: 'Rock', 
      date: new Date().toISOString().split('T')[0],
      status: 'In Progress' 
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this log?')) {
      saveLogs(logs.filter(l => l.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    const updated = logs.map(l => {
      if (l.id === id && l.category === 'Rock') {
        const nextStatus = l.status === 'Completed' ? 'In Progress' : 'Completed';
        return { ...l, status: nextStatus };
      }
      return l;
    });
    saveLogs(updated);
  };

  const filteredLogs = logs.filter(l => l.date === activeDate);

  const activeDayOfWeek = new Date(activeDate).toLocaleDateString('en-US', { weekday: 'long' });
  const todaysTimetable = timetable.filter(t => t.day === activeDayOfWeek).sort((a,b) => a.period.localeCompare(b.period));

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'School': return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case 'Tutor': return <Users className="h-4 w-4 text-purple-600" />;
      case 'Self Study': return <BookOpen className="h-4 w-4 text-indigo-600" />;
      case 'Play': return <Gamepad2 className="h-4 w-4 text-orange-500" />;
      case 'Activity': return <Activity className="h-4 w-4 text-green-600" />;
      default: return <ClipboardList className="h-4 w-4 text-slate-500" />;
    }
  };

  const getCategoryColor = (cat: string | undefined) => {
    switch (cat) {
      case 'Rock': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Sand': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Pebble': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const calculateDuration = (logsArr: DailyLogEntry[]) => {
    let totalMins = 0;
    logsArr.forEach(l => {
      if (l.timeFrom && l.timeTo) {
        const [fh, fm] = l.timeFrom.split(':').map(Number);
        const [th, tm] = l.timeTo.split(':').map(Number);
        let dur = (th * 60 + tm) - (fh * 60 + fm);
        if (dur < 0) dur += 24 * 60;
        totalMins += dur;
      }
    });
    
    if (totalMins === 0) return `${logsArr.length} logs`;
    
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins > 0 ? `${mins}m` : (hrs === 0 ? '0m' : '')}`;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" /> Daily Log
          </h2>
          <p className="text-sm text-slate-500 mt-1">Record and review your daily study sessions and activities.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Log
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-semibold mb-1">Rocks (Study)</div>
          <div className="text-2xl font-bold text-indigo-700">{calculateDuration(logs.filter(l => l.category === 'Rock' || !l.category))}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-semibold mb-1">Pebbles (Activities)</div>
          <div className="text-2xl font-bold text-green-700">{calculateDuration(logs.filter(l => l.category === 'Pebble'))}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-semibold mb-1">Sand (Play)</div>
          <div className="text-2xl font-bold text-orange-700">{calculateDuration(logs.filter(l => l.category === 'Sand'))}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Main Log List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => {
                  const d = new Date(activeDate);
                  d.setDate(d.getDate() - 1);
                  setActiveDate(d.toISOString().split('T')[0]);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-md text-slate-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <input 
                type="date" 
                value={activeDate}
                onChange={(e) => setActiveDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={() => {
                  const d = new Date(activeDate);
                  d.setDate(d.getDate() + 1);
                  setActiveDate(d.toISOString().split('T')[0]);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-md text-slate-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            <button 
              onClick={() => setActiveDate(new Date().toISOString().split('T')[0])}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg w-full sm:w-auto text-center"
            >
              Today
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type / Time</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      <p className="font-medium text-slate-600 mb-1">No logs for this date.</p>
                      <p className="text-sm">Click "Add Log" to record an activity.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {getTypeIcon(log.logType)}
                            <span className="font-bold text-slate-700 text-sm">{log.logType || 'Study'}</span>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border w-max ${getCategoryColor(log.category || 'Rock')}`}>
                            {log.category || 'Rock'}
                          </span>
                          {(log.timeFrom || log.timeTo) && (
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {log.timeFrom} - {log.timeTo}
                            </div>
                          )}
                          {log.period && (
                            <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-max">
                              {log.period}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 max-w-[300px]">
                        {log.category === 'Rock' || !log.category ? (
                          <>
                            <div className="font-bold text-slate-800 text-sm">{log.subjectName} &middot; {log.chapterName}</div>
                            <div className="text-xs text-slate-600 mt-1">{log.topicName} {log.subTopicName && `> ${log.subTopicName}`}</div>
                          </>
                        ) : (
                          <div className="font-bold text-slate-800 text-sm">{log.activityDetail}</div>
                        )}
                        
                        {log.notes && (
                          <div className="mt-2 text-xs text-slate-500 italic border-l-2 border-slate-200 pl-2">"{log.notes}"</div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {(log.category === 'Rock' || !log.category) ? (
                          <button 
                            onClick={() => toggleStatus(log.id)}
                            className="focus:outline-none"
                          >
                            {log.status === 'Completed' ? (
                              <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-slate-300 mx-auto hover:border-indigo-400 transition-colors"></div>
                            )}
                            <div className="text-[10px] font-semibold text-slate-500 mt-1">{log.status}</div>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDelete(log.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* School Timetable Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-600" /> School Timetable
          </h3>
          <p className="text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
            Log what was taught in school today ({activeDayOfWeek}).
          </p>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {todaysTimetable.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-4">
                No classes scheduled for {activeDayOfWeek}.
              </div>
            ) : (
              todaysTimetable.map(t => {
                const sub = syllabus.find(s => s.id === t.subjectId);
                const isLogged = filteredLogs.some(l => l.period === t.period && l.logType === 'School');
                
                return (
                  <div key={t.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t.period}</div>
                      <div className="font-bold text-slate-800 text-sm">{sub?.name || 'Unknown'}</div>
                    </div>
                    {isLogged ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                        <CheckCircle className="h-4 w-4" /> Logged
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setNewLog({
                            logType: 'School',
                            category: 'Rock',
                            date: activeDate,
                            period: t.period,
                            subjectId: t.subjectId,
                            status: 'In Progress'
                          });
                          setShowAdd(true);
                        }}
                        className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 shadow-sm"
                      >
                        Update
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
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
              
              {/* Type Selection */}
              <div className="mb-6 border-b border-slate-100 pb-6">
                <label className="block text-sm font-bold text-slate-700 mb-3">Activity Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(['School', 'Tutor', 'Self Study', 'Play', 'Activity'] as LogType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleLogTypeChange(type)}
                      className={`px-2 py-2 border rounded-lg text-[11px] sm:text-xs font-semibold flex flex-col items-center gap-2 transition-colors ${
                        newLog.logType === type
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {getTypeIcon(type)}
                      {type}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getCategoryColor(newLog.category)}`}>
                    Category: {newLog.category}
                  </span>
                  {newLog.logType === 'School' && newLog.period && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-bold border border-blue-200 bg-blue-100 text-blue-800">
                      {newLog.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6 pb-6 border-b border-slate-100">
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Time From (Optional)</label>
                  <input
                    type="time"
                    value={newLog.timeFrom || ''}
                    onChange={e => setNewLog({...newLog, timeFrom: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Time To (Optional)</label>
                  <input
                    type="time"
                    value={newLog.timeTo || ''}
                    onChange={e => setNewLog({...newLog, timeTo: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Conditional Fields */}
              {(newLog.category === 'Rock') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">
                  <div className="sm:col-span-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Topic Taught / Studied</h4>
                    
                    {newLog.logType !== 'School' && (
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
                    )}
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
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic</label>
                    <select
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
                </div>
              )}

              {newLog.category === 'Sand' && (
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Type of Play / Game *</label>
                  <select
                    required
                    value={newLog.activityDetail || ''}
                    onChange={e => setNewLog({...newLog, activityDetail: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="Online Game">Online Game</option>
                    <option value="Mobile Game">Mobile Game</option>
                    <option value="With Friends">With Friends</option>
                    <option value="TV">TV</option>
                    <option value="Other Play">Other Play</option>
                  </select>
                </div>
              )}

              {newLog.category === 'Pebble' && (
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Type of Activity *</label>
                  <input
                    type="text"
                    required
                    value={newLog.activityDetail || ''}
                    onChange={e => setNewLog({...newLog, activityDetail: e.target.value})}
                    placeholder="e.g. Badminton Training, Book Reading, Project"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span onClick={() => setNewLog({...newLog, activityDetail: 'Badminton Training'})} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded cursor-pointer">Badminton Training</span>
                    <span onClick={() => setNewLog({...newLog, activityDetail: 'Book Reading'})} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded cursor-pointer">Book Reading</span>
                    <span onClick={() => setNewLog({...newLog, activityDetail: 'Project / Craft'})} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded cursor-pointer">Project / Craft</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newLog.notes || ''}
                  onChange={e => setNewLog({...newLog, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Enter any notes..."
                />
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
