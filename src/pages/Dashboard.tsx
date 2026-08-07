import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { BookOpen, Star, BarChart3, CheckCircle2, Clock, Calendar as CalendarIcon, RefreshCw, Trophy, Target, Sparkles, Globe2, Edit3, X } from 'lucide-react';

export default function Dashboard() {
  const { currentUser } = useAuth();
  
  const [totalPoints, setTotalPoints] = React.useState(0);
  const [upcomingEvent, setUpcomingEvent] = React.useState({ name: 'Upcoming Event', date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0] });
  const [isEditingEvent, setIsEditingEvent] = React.useState(false);
  
  const [topicsLogged, setTopicsLogged] = React.useState(0);
  const [revisionsDue, setRevisionsDue] = React.useState(0);
  const [pendingTasks, setPendingTasks] = React.useState(0);
  const [overallProgress, setOverallProgress] = React.useState(0);
  const [recentTopics, setRecentTopics] = React.useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = React.useState<any[]>([]);

  React.useEffect(() => {
    const load = () => {
    // Basic local load first
    const loadFromLocal = () => {
      // 1. Load points
      const savedAppreciation = localStorage.getItem('dugu_appreciation');
      if (savedAppreciation) {
        const records = JSON.parse(savedAppreciation);
        setTotalPoints(records.reduce((sum: number, r: any) => sum + (Number(r.points) || 0), 0));
      }
      
      // 2. Load Event
      const savedEvent = localStorage.getItem('dugu_upcoming_event');
      if (savedEvent) setUpcomingEvent(JSON.parse(savedEvent));

      // 4. Load Revisions
      const savedRevisions = localStorage.getItem('dugu_revisions');
      if (savedRevisions) {
        const revs = JSON.parse(savedRevisions);
        const today = new Date().toISOString().split('T')[0];
        const due = revs.filter((r: any) => r.status === 'Pending' && r.nextRevisionDate <= today);
        setRevisionsDue(due.length);
      }

      // 5. Load Tasks
      const savedTasks = localStorage.getItem('dugu_tasks');
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const pending = tasks.filter((t: any) => t.status === 'Pending');
        setPendingTasks(pending.length);
      }
    };
    
    loadFromLocal();

    const fetchSyncData = async () => {
      try {
        let logs: any[] = [];
        const savedLogs = localStorage.getItem('dugu_daily_logs');
        if (savedLogs) {
          logs = JSON.parse(savedLogs);
        }

        setTopicsLogged(logs.length);
        setRecentTopics(logs.slice(0, 3));

        const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
        const savedPlan = localStorage.getItem('dugu_study_plan');
        
        if (savedSyllabus) {
          const syllabus = JSON.parse(savedSyllabus);
          let plan: any[] = [];
          if (savedPlan) plan = JSON.parse(savedPlan);
          
          const colors = ['bg-indigo-600', 'bg-purple-600', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
          
          let totalItems = 0;
          let completedItems = 0;
          
          const subProgs = syllabus.map((sub: any, idx: number) => {
            let subTotalTopics = 0;
            sub.chapters?.forEach((ch: any) => {
              subTotalTopics += ch.topics?.length || 0;
            });
            
            const completedInPlan = plan.filter((p: any) => p.subjectId === sub.id && p.status === 'Completed').map((p: any) => p.topicId);
            const completedInLogs = logs.filter((l: any) => l.subjectId === sub.id && l.status === 'Completed').map((l: any) => l.topicId);
            const completedTopics = new Set([...completedInPlan, ...completedInLogs]);
            const completedCount = Array.from(completedTopics).filter(id => id).length;
            const additionalCompleted = [...completedInPlan, ...completedInLogs].filter(id => !id).length;
            const completedInSub = completedCount + additionalCompleted;
            
            const displayTotal = Math.max(subTotalTopics, plan.filter((p: any) => p.subjectId === sub.id).length);
            
            totalItems += displayTotal;
            completedItems += completedInSub;
            
            const pct = displayTotal > 0 ? Math.round((completedInSub / displayTotal) * 100) : 0;
            
            return {
              id: sub.id,
              name: sub.name,
              progress: completedInSub,
              total: displayTotal,
              pct: pct,
              color: colors[idx % colors.length]
            };
          });
          
          setSubjectProgress(subProgs);
          setOverallProgress(totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0);
        }
      } catch (e) {
        console.error('Failed to sync data for dashboard:', e);
      }
    };

    fetchSyncData();
      };
    load();
    window.addEventListener('cloud_sync_update', load);
    return () => window.removeEventListener('cloud_sync_update', load);
  }, []);

  const saveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('dugu_upcoming_event', JSON.stringify(upcomingEvent));
    setIsEditingEvent(false);
  };

  const daysLeft = Math.ceil((new Date(upcomingEvent.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <span className="text-4xl">👋</span> Welcome, {currentUser?.username || 'User'}!
        </h2>
        <p className="text-slate-500 font-medium mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Exam Banner */}
      <div className="bg-[#1F4E79] rounded-xl p-4 text-white flex justify-between items-center mb-6 shadow-sm relative group">
        <div>
          <div className="text-xs text-indigo-200 uppercase tracking-wider font-semibold mb-1">Next Event</div>
          <div className="text-xl font-bold flex items-center gap-2">
            📅 {upcomingEvent.name}
          </div>
          <div className="text-xs text-indigo-200 mt-1">{upcomingEvent.date}</div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="text-right">
            <div className="text-4xl font-black leading-none">{daysLeft > 0 ? daysLeft : 0}</div>
            <div className="text-xs text-indigo-200 mt-1 font-medium">{daysLeft === 1 ? 'day left' : 'days left'}</div>
          </div>
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Teacher') && (
            <button
              onClick={() => setIsEditingEvent(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors ml-4"
              title="Edit Upcoming Event"
            >
              <Edit3 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {isEditingEvent && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Edit Upcoming Event</h3>
              <button onClick={() => setIsEditingEvent(false)} className="text-slate-400 hover:text-slate-600">
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={saveEvent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Event Name</label>
                  <input
                    type="text"
                    required
                    value={upcomingEvent.name}
                    onChange={e => setUpcomingEvent({ ...upcomingEvent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Term-I Exams"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={upcomingEvent.date}
                    onChange={e => setUpcomingEvent({ ...upcomingEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingEvent(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-yellow-500">
          <div className="text-3xl font-black text-yellow-500 flex items-center gap-1">
            {totalPoints} <Star className="h-5 w-5 fill-current" />
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Total Points</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-indigo-600">
          <div className="text-3xl font-black text-indigo-600">{topicsLogged}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Topics Logged</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-orange-600">
          <div className="text-3xl font-black text-orange-600">{revisionsDue}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Revisions Due</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-teal-700 flex flex-col items-center justify-center relative">
          <div className="text-xs text-slate-500 font-medium absolute top-4 left-4">Overall Progress</div>
          <div className="relative w-24 h-12 overflow-hidden mt-6">
            <svg className="absolute top-0 left-0 w-24 h-24" viewBox="0 0 100 100">
              <path
                d="M 10,50 a 40,40 0 0,1 80,0"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 10,50 a 40,40 0 0,1 80,0"
                fill="none"
                stroke="#0f766e"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="125.66"
                strokeDashoffset={125.66 - (overallProgress / 100) * 125.66}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute bottom-0 w-full text-center text-xl font-black text-teal-700 leading-none">
              {overallProgress}%
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-t-4 border-t-purple-600">
          <div className="text-3xl font-black text-purple-600">{pendingTasks}</div>
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
              <div className="text-sm font-bold text-slate-900">{currentUser?.username || 'User'}</div>
              <div className="text-xs text-slate-500">{currentUser?.timezone || 'Timezone'}</div>
            </div>
          </div>
          <div className="text-sm font-bold text-indigo-600">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
            {subjectProgress.length === 0 ? (
               <div className="text-center py-6 text-slate-500 text-sm">No subjects found in syllabus.</div>
            ) : (
              subjectProgress.map((sub: any, idx: number) => (
                <div key={sub.id || sub.name + idx}>
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
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Revisions Due */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" /> Revisions Due Today
            </h3>
            {revisionsDue === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-500">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">All clear!</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-500">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                  <RefreshCw className="h-8 w-8 text-orange-600" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">You have {revisionsDue} pending revisions!</p>
              </div>
            )}
          </div>

          {/* Recent Topics */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-500" /> Recent Logged Topics
            </h3>
            <div className="space-y-2">
              {recentTopics.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">No topics logged yet.</div>
              ) : (
                recentTopics.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-800">{log.subjectName} - {log.chapterName}</div>
                      <div className="text-[11px] text-slate-500">{log.topicName} {log.subTopicName ? `(${log.subTopicName})` : ''}</div>
                    </div>
                    <div className="text-[10px] text-slate-400">{log.date}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
