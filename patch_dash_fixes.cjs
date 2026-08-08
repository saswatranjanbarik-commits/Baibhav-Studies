const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add useNavigate import
if (!content.includes("useNavigate")) {
    content = content.replace("import { BookOpen,", "import { useNavigate } from 'react-router-dom';\nimport { BookOpen,");
}

// 2. Add teamUsers state
if (!content.includes("teamUsers")) {
    content = content.replace("const [subjectProgress, setSubjectProgress] = React.useState<any[]>([]);", "const [subjectProgress, setSubjectProgress] = React.useState<any[]>([]);\n  const [teamUsers, setTeamUsers] = React.useState<any[]>([]);\n  const navigate = useNavigate();");
}

// 3. Add fetching users from firebase
if (!content.includes("collection(db, 'users')")) {
    content = content.replace("import { useAuth } from '../lib/AuthContext';", "import { useAuth } from '../lib/AuthContext';\nimport { collection, getDocs } from 'firebase/firestore';\nimport { db } from '../lib/firebase';");
    
    // insert inside load()
    content = content.replace("const loadFromLocal = () => {", "const loadFromLocal = async () => {\n      try { const usersSnap = await getDocs(collection(db, 'users')); setTeamUsers(usersSnap.docs.map(d => d.data())); } catch (e) { console.error(e); }\n");
}

// 4. Update Recent Logged Topics sort and slice
content = content.replace("setRecentTopics(logs.slice(0, 3));", "setRecentTopics([...logs].sort((a,b) => new Date(b.date + 'T' + (b.timeFrom || '00:00')).getTime() - new Date(a.date + 'T' + (a.timeFrom || '00:00')).getTime()).slice(0, 3));");

// 5. Make Stats row click navigate
const regexRevisions = /<div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm border-t-4 border-t-orange-600 flex flex-col justify-between">/g;
content = content.replace(regexRevisions, '<div onClick={() => navigate("/revisions")} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm border-t-4 border-t-orange-600 flex flex-col justify-between cursor-pointer hover:bg-orange-50 transition-colors">');

const regexTasks = /<div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm border-t-4 border-t-purple-600 flex flex-col justify-between">/g;
content = content.replace(regexTasks, '<div onClick={() => navigate("/tasks")} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm border-t-4 border-t-purple-600 flex flex-col justify-between cursor-pointer hover:bg-purple-50 transition-colors">');

// 6. Update Subject Progress green color
content = content.replace("className={`\\${sub.color.replace('bg-', 'text-')} mb-0.5`}>Completed</div>", 'className="text-green-600 mb-0.5">Completed</div>');
content = content.replace('<div className="font-bold text-slate-700 text-xs">{sub.progress}</div>', '<div className="font-bold text-green-700 text-xs">{sub.progress}</div>');


// 7. Update Team Online rendering
const regexTeamOnline = /<div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newTeamOnline = `<div className="space-y-2 max-h-48 overflow-y-auto">
          {teamUsers.length > 0 ? (
            teamUsers.map((user: any, i: number) => (
              <div key={user.id || i} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{user.username || 'User'}</div>
                    <div className="text-xs text-slate-500">{user.timezone || 'Timezone'}</div>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-indigo-600 px-2 py-1 bg-indigo-50 rounded">
                  {user.role}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{currentUser?.username || 'User'}</div>
                  <div className="text-xs text-slate-500">{currentUser?.timezone || 'Timezone'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>`;

content = content.replace(regexTeamOnline, newTeamOnline);

fs.writeFileSync(file, content);
console.log("Patched");
