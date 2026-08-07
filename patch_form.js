const fs = require('fs');
let content = fs.readFileSync('src/pages/DailyLog.tsx', 'utf-8');

const targetStr = `              {/* Conditional Fields */}
              {(newLog.category === 'Rock') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">`;

const replacement = `              {/* Conditional Fields */}
              {(newLog.logType === 'School' || newLog.logType === 'Tutor') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Class Status</label>
                    <select
                      value={newLog.classStatus || 'Attended'}
                      onChange={e => setNewLog({ ...newLog, classStatus: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Attended">Attended</option>
                      <option value="Teacher Absent">Teacher Absent</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                  </div>
                </div>
              )}

              {(newLog.category === 'Rock') && (!newLog.classStatus || newLog.classStatus === 'Attended') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/pages/DailyLog.tsx', content);
