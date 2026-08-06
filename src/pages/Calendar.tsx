import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, Tag, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: 'Study' | 'Exam' | 'Homework' | 'Class' | 'Other';
  location?: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  category: string;
}

interface DailyLogEntry {
  id: string;
  date: string;
  logType?: string;
  category?: string;
  timeFrom?: string;
  timeTo?: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string;
  activityDetail?: string;
  teacherName?: string;
}

export default function Calendar() {
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    type: 'Study'
  });

  useEffect(() => {
    // Local load first
    const savedEvents = localStorage.getItem('dugu_events');
    if (savedEvents) setEvents(JSON.parse(savedEvents));

    const savedTasks = localStorage.getItem('dugu_tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));

    const savedLogs = localStorage.getItem('dugu_daily_logs');
    if (savedLogs) setDailyLogs(JSON.parse(savedLogs));

    // Sync from server
    const fetchSyncData = async () => {
      try {
        const resLogs = await fetch('/api/store/dugu_daily_logs');
        if (resLogs.ok) {
          const logs = await resLogs.json();
          setDailyLogs(logs);
          localStorage.setItem('dugu_daily_logs', JSON.stringify(logs));
        }
        const resEvents = await fetch('/api/store/dugu_events');
        if (resEvents.ok) {
          const eventsData = await resEvents.json();
          setEvents(eventsData);
          localStorage.setItem('dugu_events', JSON.stringify(eventsData));
        }
      } catch (e) {
        console.error('Failed to sync data for calendar:', e);
      }
    };
    fetchSyncData();
  }, []);

  const saveEvents = async (newEvents: Event[]) => {
    try {
      const res = await fetch('/api/store/dugu_events');
      let currentEvents = events;
      if (res.ok) {
        currentEvents = await res.json();
      }
      // Since it's a direct overwrite on this app usually, we just save what we have or merge.
      // But to keep it simple and safe for adding, we'll just overwrite.
      setEvents(newEvents);
      localStorage.setItem('dugu_events', JSON.stringify(newEvents));
    } catch (e) {
      setEvents(newEvents);
      localStorage.setItem('dugu_events', JSON.stringify(newEvents));
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;

    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description || '',
      date: newEvent.date,
      time: newEvent.time,
      type: newEvent.type as any,
      location: newEvent.location,
    };

    saveEvents([...events, event]);
    setShowAddModal(false);
    setNewEvent({ type: 'Study' });
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Delete this event?')) {
      saveEvents(events.filter(e => e.id !== id));
    }
  };

  const getEventsForDate = (dateStr: string) => {
    const dayEvents = events.filter(e => e.date === dateStr);
    const dayTasks = tasks.filter(t => t.dueDate === dateStr);
    const dayLogs = dailyLogs.filter(l => l.date === dateStr);
    return { dayEvents, dayTasks, dayLogs };
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Exam': return 'bg-red-100 text-red-700 border-red-200';
      case 'Class': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Homework': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Study': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
    if (totalMins === 0) return `${logsArr.length}`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins > 0 ? `${mins}m` : (hrs === 0 ? '0m' : '')}`;
  };

  const monthLogs = dailyLogs.filter(l => {
    if (!l.date) return false;
    const d = new Date(l.date);
    return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
  });

  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const weeks: any[][] = [];
    let currentWeek: any[] = [];
    
    // Empty cells for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      currentWeek.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks.map((week, wIdx) => {
      // Find the first valid date in this week to calculate week number
      const firstValidDay = week.find(d => d !== null) || 1;
      const weekDate = new Date(year, month, firstValidDay);
      const weekNum = getWeekNumber(weekDate);

      // Collect logs for this week
      const weekDates = week.map(d => d ? `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null);
      const weeklyLogs = dailyLogs.filter(l => l.date && weekDates.includes(l.date));
      const rDur = calculateDuration(weeklyLogs.filter(l => l.category === 'Rock' || !l.category));
      const pDur = calculateDuration(weeklyLogs.filter(l => l.category === 'Pebble'));
      const sDur = calculateDuration(weeklyLogs.filter(l => l.category === 'Sand'));

      return (
        <React.Fragment key={wIdx}>
          <div className="bg-slate-50 border border-slate-200 p-2 flex flex-col justify-center items-center">
            <div className="text-xs font-bold text-slate-700 mb-1 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">
              Week {weekNum}
            </div>
            <div className="flex flex-col gap-0.5 text-[10px] w-full mt-1">
               <div className="flex justify-between items-center bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded border border-indigo-100">
                 <span className="font-bold">R:</span><span>{rDur}</span>
               </div>
               <div className="flex justify-between items-center bg-green-50 text-green-700 px-1 py-0.5 rounded border border-green-100">
                 <span className="font-bold">P:</span><span>{pDur}</span>
               </div>
               <div className="flex justify-between items-center bg-orange-50 text-orange-700 px-1 py-0.5 rounded border border-orange-100">
                 <span className="font-bold">S:</span><span>{sDur}</span>
               </div>
            </div>
          </div>
          {week.map((d, dIdx) => {
            if (d === null) {
              return <div key={`empty-${wIdx}-${dIdx}`} className="min-h-[100px] sm:min-h-[120px] p-2 bg-slate-50/50 border border-slate-100"></div>;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const { dayEvents, dayTasks, dayLogs } = getEventsForDate(dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div 
                key={d} 
                className={`min-h-[100px] sm:min-h-[120px] p-1 sm:p-2 border ${isToday ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-200'} transition-colors hover:bg-slate-50 relative group flex flex-col`}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setNewEvent({ ...newEvent, date: dateStr });
                  setShowAddModal(true);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                    {d}
                  </span>
                  <button 
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-50 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewEvent({ ...newEvent, date: dateStr });
                      setShowAddModal(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {dayTasks.map(task => (
                    <div 
                      key={`task-${task.id}`}
                      className="text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 cursor-default"
                      title={`Task: ${task.title}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {dayLogs && dayLogs.map(log => (
                    <div 
                      key={`log-${log.id}`}
                      className={`text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded border flex items-center justify-between gap-1 cursor-default group/log ${
                        log.category === 'Pebble' ? 'bg-green-50 text-green-700 border-green-200' :
                        log.category === 'Sand' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                      title={`${log.timeFrom || ''} - ${log.logType} ${log.teacherName ? `(By ${log.teacherName})` : ''} ${log.subjectName ? `(${log.subjectName})` : ''} ${log.activityDetail || ''}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span className="truncate">
                          {log.timeFrom && <span className="font-semibold mr-1">{log.timeFrom}</span>}
                          {log.logType === 'Activity' || log.logType === 'Play' ? log.activityDetail : (log.subjectName || log.logType)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dayEvents.map(event => (
                    <div 
                      key={`event-${event.id}`}
                      className={`text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded border flex items-center justify-between gap-1 ${getTypeColor(event.type)} cursor-default group/event`}
                      title={`${event.title} (${event.type})`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span className="truncate">{event.time && <span className="font-semibold mr-1">{event.time}</span>}{event.title}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                        className="opacity-0 group-hover/event:opacity-100 text-red-500 hover:text-red-700 p-0.5 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </React.Fragment>
      );
    });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-red-400" /> Calendar & Planner
          </h2>
          <p className="text-sm text-slate-500 mt-1">Schedule study sessions, track classes, and see upcoming tasks.</p>
        </div>
        {!isStudent && (
          <button
            onClick={() => {
              setNewEvent({ ...newEvent, date: new Date().toISOString().split('T')[0] });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Event
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div className="text-sm font-bold text-slate-700 uppercase tracking-wider">Month Totals</div>
          <div className="flex gap-4">
             <div className="text-sm font-semibold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>Rock (Study): <span className="text-indigo-600 font-bold ml-1">{calculateDuration(monthLogs.filter(l => l.category === 'Rock' || !l.category))}</span></div>
             <div className="text-sm font-semibold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Pebbles: <span className="text-green-600 font-bold ml-1">{calculateDuration(monthLogs.filter(l => l.category === 'Pebble'))}</span></div>
             <div className="text-sm font-semibold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div>Sand (Play): <span className="text-orange-600 font-bold ml-1">{calculateDuration(monthLogs.filter(l => l.category === 'Sand'))}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 bg-white text-slate-600 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 bg-white text-slate-600 font-semibold text-sm transition-colors"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 bg-white text-slate-600 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
          <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Week</div>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-l border-slate-200">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-8 bg-slate-100 gap-[1px]">
          {renderCalendar()}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                Add Calendar Event
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddEvent} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEvent.title || ''}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  placeholder="e.g., Math Study Group"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date || ''}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Time (Optional)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      value={newEvent.time || ''}
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Event Type *</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      required
                      value={newEvent.type || 'Study'}
                      onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm appearance-none"
                    >
                      <option value="Study">Study Session</option>
                      <option value="Class">Class / Lecture</option>
                      <option value="Exam">Exam / Quiz</option>
                      <option value="Homework">Homework</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Location (Optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={newEvent.location || ''}
                      onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                      placeholder="e.g., Library, Zoom..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newEvent.description || ''}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm resize-none"
                  placeholder="Add details, links, or notes here..."
                />
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

