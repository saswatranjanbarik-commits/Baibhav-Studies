const fs = require('fs');
let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf-8');

const stateHookStr = `  const [practiceSession, setPracticeSession] = useState<{`;
const newHooks = `  const [practiceSubjectId, setPracticeSubjectId] = useState('');
  const [practiceChapterId, setPracticeChapterId] = useState('');
  const [practiceSession, setPracticeSession] = useState<{`;
content = content.replace(stateHookStr, newHooks);

const startSessionStr = `  const startSession = (type: ItemType) => {
    const sessionItems = items.filter(i => i.type === type);`;
const newStartSession = `  const startSession = (type: ItemType) => {
    let sessionItems = items.filter(i => i.type === type);
    if (practiceSubjectId) {
      sessionItems = sessionItems.filter(i => i.subjectId === practiceSubjectId);
    }
    if (practiceChapterId) {
      sessionItems = sessionItems.filter(i => i.chapterId === practiceChapterId);
    }`;
content = content.replace(startSessionStr, newStartSession);

const uiStr = `            <p className="text-slate-500 mb-6 max-w-md">
              {activeTab === 'flashcards' 
                ? 'Test your memory by flipping cards. Great for quick reviews.' 
                : 'Take a multiple choice quiz to thoroughly test your knowledge.'}
            </p>
            <button`;

const newUI = `            <p className="text-slate-500 mb-6 max-w-md">
              {activeTab === 'flashcards' 
                ? 'Test your memory by flipping cards. Great for quick reviews.' 
                : 'Take a multiple choice quiz to thoroughly test your knowledge.'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full max-w-lg">
              <select
                value={practiceSubjectId}
                onChange={e => { setPracticeSubjectId(e.target.value); setPracticeChapterId(''); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">All Subjects</option>
                {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              
              <select
                value={practiceChapterId}
                onChange={e => setPracticeChapterId(e.target.value)}
                disabled={!practiceSubjectId}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">All Chapters</option>
                {practiceSubjectId && syllabus.find(s => s.id === practiceSubjectId)?.chapters?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button`;

content = content.replace(uiStr, newUI);

// And we need to fix the disable logic of the start button.
const disableStr = `disabled={items.filter(i => i.type === (activeTab === 'flashcards' ? 'flashcard' : 'quiz')).length === 0}`;
const newDisable = `disabled={items.filter(i => i.type === (activeTab === 'flashcards' ? 'flashcard' : 'quiz') && (!practiceSubjectId || i.subjectId === practiceSubjectId) && (!practiceChapterId || i.chapterId === practiceChapterId)).length === 0}`;
content = content.replace(disableStr, newDisable);

const noItemsStr = `{items.filter(i => i.type === (activeTab === 'flashcards' ? 'flashcard' : 'quiz')).length === 0 && (
              <p className="text-sm text-red-500 mt-3 font-medium">No items available. Add some in Manage Content first.</p>
            )}`;
const newNoItems = `{items.filter(i => i.type === (activeTab === 'flashcards' ? 'flashcard' : 'quiz') && (!practiceSubjectId || i.subjectId === practiceSubjectId) && (!practiceChapterId || i.chapterId === practiceChapterId)).length === 0 && (
              <p className="text-sm text-red-500 mt-3 font-medium">No items available for this selection.</p>
            )}`;
content = content.replace(noItemsStr, newNoItems);

fs.writeFileSync('src/pages/Flashcards.tsx', content);
