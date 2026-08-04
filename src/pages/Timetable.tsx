import React, { useState, useEffect } from 'react';
import { Clock, Plus, X } from 'lucide-react';

interface TimetableEntry {
  id: string;
  day: string;
  period: string;
  subjectId: string;
}

export default function Timetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Period 8'];

  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));

    const savedEntries = localStorage.getItem('dugu_timetable');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  const saveEntries = (newEntries: TimetableEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('dugu_timetable', JSON.stringify(newEntries));
  };

  const updateEntry = (day: string, period: string, subjectId: string) => {
    let newEntries = [...entries];
    const index = newEntries.findIndex(e => e.day === day && e.period === period);
    
    if (subjectId) {
      if (index >= 0) {
        newEntries[index].subjectId = subjectId;
      } else {
        newEntries.push({ id: Date.now().toString(), day, period, subjectId });
      }
    } else {
      if (index >= 0) {
        newEntries = newEntries.filter(e => !(e.day === day && e.period === period));
      }
    }
    saveEntries(newEntries);
  };

  const getSubjectName = (subjectId: string) => {
    const s = syllabus.find(s => s.id === subjectId);
    return s ? s.name : '';
  };

  const getEntry = (day: string, period: string) => {
    return entries.find(e => e.day === day && e.period === period);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-indigo-600" /> Teaching Timetable
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure subjects for each period of the week.</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm ${isEditing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {isEditing ? 'Save Timetable' : 'Edit Timetable'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 border-r border-slate-200 w-32">Day</th>
              {periods.map(p => (
                <th key={p} className="p-4 text-center">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {days.map(day => (
              <tr key={day} className="hover:bg-slate-50">
                <td className="p-4 border-r border-slate-200 font-bold text-slate-700 bg-slate-50/50">{day}</td>
                {periods.map(period => {
                  const entry = getEntry(day, period);
                  return (
                    <td key={period} className="p-2 border-r border-slate-100 last:border-r-0 text-center">
                      {isEditing ? (
                        <select
                          value={entry?.subjectId || ''}
                          onChange={(e) => updateEntry(day, period, e.target.value)}
                          className="w-full p-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          <option value=""></option>
                          {syllabus.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm font-semibold text-indigo-700 min-h-[24px] flex items-center justify-center">
                          {entry ? getSubjectName(entry.subjectId) : <span className="text-slate-300">-</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
