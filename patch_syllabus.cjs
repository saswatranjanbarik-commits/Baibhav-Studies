const fs = require('fs');
let content = fs.readFileSync('src/pages/Syllabus.tsx', 'utf-8');

const importStr = `import { Book, Plus, X, Search, ChevronDown, ChevronRight, Trash2, Pencil, Upload, CheckCircle2, Download, Layers, Clock } from 'lucide-react';`;
const newImport = `import { Book, Plus, X, Search, ChevronDown, ChevronRight, Trash2, Pencil, Upload, CheckCircle2, Download, Layers, Clock, PlayCircle } from 'lucide-react';`;
content = content.replace(importStr, newImport);

const stateHookStr = `  const [subjects, setSubjects] = useState<Subject[]>([]);`;
const newStateHooks = `  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [learningItems, setLearningItems] = useState<any[]>([]);`;
content = content.replace(stateHookStr, newStateHooks);

const fetchStr = `    const saved = localStorage.getItem('dugu_syllabus_v2');
    if (saved) {`;
const newFetchStr = `    const savedItems = localStorage.getItem('dugu_learning_items');
    if (savedItems) setLearningItems(JSON.parse(savedItems));
    const saved = localStorage.getItem('dugu_syllabus_v2');
    if (saved) {`;
content = content.replace(fetchStr, newFetchStr);

const listStr = `                      <div className="pl-6 mb-3">
                        <Link to="/flashcards" className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md transition-colors">
                          <Layers className="h-3.5 w-3.5" />
                          Flashcards & Quizzes for this Chapter
                        </Link>
                      </div>`;

const newListStr = `                      <div className="pl-6 mb-3 flex flex-col gap-2">
                        {(() => {
                          const fcCount = learningItems.filter(i => i.chapterId === chapter.id && i.type === 'flashcard').length;
                          const quizCount = learningItems.filter(i => i.chapterId === chapter.id && i.type === 'quiz').length;
                          return (
                            <div className="flex gap-2">
                              {fcCount > 0 && (
                                <Link to={\`/flashcards?subjectId=\${activeSubject.id}&chapterId=\${chapter.id}&action=play-flashcard\`} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-md transition-colors shadow-sm">
                                  <PlayCircle className="h-4 w-4" />
                                  Practice {fcCount} Flashcards
                                </Link>
                              )}
                              {quizCount > 0 && (
                                <Link to={\`/flashcards?subjectId=\${activeSubject.id}&chapterId=\${chapter.id}&action=play-quiz\`} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:bg-red-100 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md transition-colors shadow-sm">
                                  <PlayCircle className="h-4 w-4" />
                                  Take {quizCount}-Q Quiz
                                </Link>
                              )}
                              {fcCount === 0 && quizCount === 0 && (
                                <Link to="/flashcards" className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md transition-colors">
                                  <Layers className="h-3.5 w-3.5" />
                                  Manage Flashcards & Quizzes
                                </Link>
                              )}
                            </div>
                          );
                        })()}
                      </div>`;

content = content.replace(listStr, newListStr);

fs.writeFileSync('src/pages/Syllabus.tsx', content);
