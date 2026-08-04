import React, { useState, useEffect } from 'react';
import { Target, Plus, X, Search, Filter, Layers, CheckCircle2, ChevronRight, ChevronLeft, Trash2, Upload, Download } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

type ItemType = 'flashcard' | 'quiz';

interface LearningItem {
  id: string;
  type: ItemType;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  // Flashcard
  front?: string;
  back?: string;
  // Quiz
  question?: string;
  options?: string[];
  correctOptionIndex?: number;
}

export default function Flashcards() {
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';
  const [activeTab, setActiveTab] = useState<'manage' | 'flashcards' | 'quiz'>(isStudent ? 'flashcards' : 'manage');
  const [items, setItems] = useState<LearningItem[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState<ItemType | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk Upload State
  const [bulkText, setBulkText] = useState('');
  const [bulkType, setBulkType] = useState<ItemType>('flashcard');
  const [bulkError, setBulkError] = useState('');

  // Practice/Quiz state
  const [practiceSession, setPracticeSession] = useState<{
    items: LearningItem[];
    currentIndex: number;
    showAnswer: boolean;
    score: number;
    answered: Record<string, number>; // itemId -> selected option index
  } | null>(null);

  // New Item State
  const [newItem, setNewItem] = useState<Partial<LearningItem>>({
    subjectId: '',
    chapterId: '',
    topicId: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0
  });

  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));

    const savedItems = localStorage.getItem('dugu_learning_items');
    if (savedItems) setItems(JSON.parse(savedItems));
  }, []);

  const saveItems = (newItems: LearningItem[]) => {
    setItems(newItems);
    localStorage.setItem('dugu_learning_items', JSON.stringify(newItems));
  };

  const activeSubject = syllabus.find(s => s.id === newItem.subjectId);
  const activeChapter = activeSubject?.chapters?.find((c: any) => c.id === newItem.chapterId);
  const activeTopic = activeChapter?.topics?.find((t: any) => t.id === newItem.topicId);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !activeChapter || !activeTopic || !showAddModal) return;

    const item: LearningItem = {
      id: Date.now().toString(),
      type: showAddModal,
      subjectId: activeSubject.id,
      subjectName: activeSubject.name,
      chapterId: activeChapter.id,
      chapterName: activeChapter.name,
      topicId: activeTopic.id,
      topicName: activeTopic.name,
    };

    if (showAddModal === 'flashcard') {
      if (!newItem.front || !newItem.back) return;
      item.front = newItem.front;
      item.back = newItem.back;
    } else {
      if (!newItem.question || !newItem.options || newItem.options.some(o => !o) || newItem.correctOptionIndex === undefined) return;
      item.question = newItem.question;
      item.options = [...newItem.options];
      item.correctOptionIndex = newItem.correctOptionIndex;
    }

    saveItems([item, ...items]);
    setShowAddModal(null);
    setNewItem({ subjectId: '', chapterId: '', topicId: '', options: ['', '', '', ''], correctOptionIndex: 0 });
  };

  const handleBulkUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    if (!activeSubject || !activeChapter || !activeTopic) {
      setBulkError('Please select Subject, Chapter, and Topic.');
      return;
    }

    if (!bulkText.trim()) {
      setBulkError('Please paste some content.');
      return;
    }

    const lines = bulkText.split('\n').filter(l => l.trim() !== '');
    const newItems: LearningItem[] = [];
    let currentId = Date.now();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // simplistic split by tab or comma
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const cleanParts = parts.map(p => p.trim());

      const item: LearningItem = {
        id: (currentId++).toString(),
        type: bulkType,
        subjectId: activeSubject.id,
        subjectName: activeSubject.name,
        chapterId: activeChapter.id,
        chapterName: activeChapter.name,
        topicId: activeTopic.id,
        topicName: activeTopic.name,
      };

      if (bulkType === 'flashcard') {
        if (cleanParts.length < 2) {
          setBulkError(`Error on line ${i + 1}: Flashcard requires at least Front and Back values separated by comma or tab.`);
          return;
        }
        item.front = cleanParts[0];
        item.back = cleanParts.slice(1).join(', '); // Join the rest in case of extra commas
      } else {
        if (cleanParts.length < 6) {
          setBulkError(`Error on line ${i + 1}: Quiz requires Question, 4 Options, and Correct Option Index (0-3).`);
          return;
        }
        item.question = cleanParts[0];
        item.options = [cleanParts[1], cleanParts[2], cleanParts[3], cleanParts[4]];
        const cIndex = parseInt(cleanParts[5], 10);
        if (isNaN(cIndex) || cIndex < 0 || cIndex > 3) {
          setBulkError(`Error on line ${i + 1}: Correct Option Index must be a number from 0 to 3.`);
          return;
        }
        item.correctOptionIndex = cIndex;
      }
      newItems.push(item);
    }

    saveItems([...newItems, ...items]);
    setShowBulkModal(false);
    setBulkText('');
    setBulkError('');
    setNewItem({ subjectId: '', chapterId: '', topicId: '', options: ['', '', '', ''], correctOptionIndex: 0 });
  };

  const downloadTemplate = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (bulkType === 'flashcard') {
      csvContent += "Front (Question),Back (Answer)\n";
      csvContent += "What is the powerhouse of the cell?,Mitochondria\n";
      csvContent += "What is 2+2?,4\n";
    } else {
      csvContent += "Question,Option 1,Option 2,Option 3,Option 4,Correct Option Index (0-3)\n";
      csvContent += "What is the capital of France?,Berlin,Madrid,Paris,Rome,2\n";
      csvContent += "Which planet is known as the Red Planet?,Venus,Mars,Jupiter,Saturn,1\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${bulkType}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      saveItems(items.filter(i => i.id !== id));
    }
  };

  const startSession = (type: ItemType) => {
    const sessionItems = items.filter(i => i.type === type);
    // In a real app, we might filter by subject/chapter here if requested
    // Shuffle the items for practice
    const shuffled = [...sessionItems].sort(() => 0.5 - Math.random());
    setPracticeSession({
      items: shuffled,
      currentIndex: 0,
      showAnswer: false,
      score: 0,
      answered: {}
    });
    setActiveTab(type === 'flashcard' ? 'flashcards' : 'quiz');

    // Automatically update daily log
    if (shuffled.length > 0) {
      try {
        const savedLogs = localStorage.getItem('dugu_daily_logs');
        const logs = savedLogs ? JSON.parse(savedLogs) : [];
        
        // Group by unique topics to log them
        const uniqueTopics = new Set<string>();
        
        shuffled.forEach(item => {
          const topicKey = `${item.subjectId}|${item.chapterId}|${item.topicId}`;
          if (!uniqueTopics.has(topicKey)) {
            uniqueTopics.add(topicKey);
            const newLog = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              date: new Date().toISOString().split('T')[0],
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              chapterId: item.chapterId,
              chapterName: item.chapterName,
              topicId: item.topicId,
              topicName: item.topicName,
              status: 'Completed',
              notes: type === 'flashcard' ? 'Practice - Flashcards' : 'Assessment - Quiz'
            };
            logs.push(newLog);
          }
        });
        
        localStorage.setItem('dugu_daily_logs', JSON.stringify(logs));
      } catch (e) {
        console.error("Failed to update daily log", e);
      }
    }
  };

  const handleNext = () => {
    if (!practiceSession) return;
    if (practiceSession.currentIndex < practiceSession.items.length - 1) {
      setPracticeSession({
        ...practiceSession,
        currentIndex: practiceSession.currentIndex + 1,
        showAnswer: false
      });
    }
  };

  const handlePrev = () => {
    if (!practiceSession) return;
    if (practiceSession.currentIndex > 0) {
      setPracticeSession({
        ...practiceSession,
        currentIndex: practiceSession.currentIndex - 1,
        showAnswer: false
      });
    }
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (!practiceSession) return;
    const currentItem = practiceSession.items[practiceSession.currentIndex];
    
    // Don't allow answering twice
    if (practiceSession.answered[currentItem.id] !== undefined) return;

    const isCorrect = currentItem.correctOptionIndex === optionIndex;
    
    setPracticeSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        score: isCorrect ? prev.score + 1 : prev.score,
        answered: {
          ...prev.answered,
          [currentItem.id]: optionIndex
        }
      };
    });
  };

  const filteredItems = items.filter(i => 
    i.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.chapterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.front && i.front.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.question && i.question.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-red-500" /> Flashcards & Quiz
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage study materials and test knowledge.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="flex border-b border-slate-200">
          {!isStudent && (
            <button
              onClick={() => { setActiveTab('manage'); setPracticeSession(null); }}
              className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
                activeTab === 'manage' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Manage Content
            </button>
          )}
          <button
            onClick={() => { setActiveTab('flashcards'); setPracticeSession(null); }}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
              activeTab === 'flashcards' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Play Flashcards
          </button>
          <button
            onClick={() => { setActiveTab('quiz'); setPracticeSession(null); }}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
              activeTab === 'quiz' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Take Quiz
          </button>
        </div>

        {activeTab === 'manage' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search questions or topics..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none w-full bg-white"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" /> Bulk Upload
                </button>
                <button
                  onClick={() => setShowAddModal('flashcard')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Flashcard
                </button>
                <button
                  onClick={() => setShowAddModal('quiz')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Quiz
                </button>
              </div>
            </div>

            {!filteredItems.length ? (
              <div className="py-12 text-center">
                <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">No content found</h3>
                <p className="text-slate-500 text-sm mt-1">Add flashcards and quiz questions to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <div key={item.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow relative group bg-white">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <div className="mb-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        item.type === 'flashcard' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {item.subjectName} &middot; {item.chapterName}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mb-3">{item.topicName}</div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 line-clamp-3">
                      {item.type === 'flashcard' ? (
                        <>
                          <span className="font-semibold">Q:</span> {item.front}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">Q:</span> {item.question}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Practice Sessions */}
        {(activeTab === 'flashcards' || activeTab === 'quiz') && !practiceSession && (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className={`p-4 rounded-full mb-4 ${activeTab === 'flashcards' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
              <Target className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {activeTab === 'flashcards' ? 'Flashcard Practice' : 'Quiz Mode'}
            </h3>
            <p className="text-slate-500 mb-6 max-w-md">
              {activeTab === 'flashcards' 
                ? 'Test your memory by flipping cards. Great for quick reviews.' 
                : 'Take a multiple choice quiz to thoroughly test your knowledge.'}
            </p>
            <button
              onClick={() => startSession(activeTab === 'flashcards' ? 'flashcard' : 'quiz')}
              disabled={items.filter(i => i.type === (activeTab === 'flashcards' ? 'flashcard' : 'quiz')).length === 0}
              className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start {activeTab === 'flashcards' ? 'Practice' : 'Quiz'} Now
            </button>
            {items.filter(i => i.type === (activeTab === 'flashcards' ? 'flashcard' : 'quiz')).length === 0 && (
              <p className="text-sm text-red-500 mt-3 font-medium">No items available. Add some in Manage Content first.</p>
            )}
          </div>
        )}

        {/* Active Practice Session UI */}
        {practiceSession && practiceSession.items.length > 0 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Question {practiceSession.currentIndex + 1} of {practiceSession.items.length}
              </div>
              {activeTab === 'quiz' && (
                <div className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  Score: {practiceSession.score}
                </div>
              )}
            </div>

            <div className="max-w-2xl mx-auto">
              {activeTab === 'flashcards' ? (
                // Flashcard UI
                <div 
                  className="aspect-[3/2] w-full perspective-1000 cursor-pointer"
                  onClick={() => setPracticeSession({...practiceSession, showAnswer: !practiceSession.showAnswer})}
                >
                  <div className={`w-full h-full relative transition-transform duration-500 transform-style-3d ${practiceSession.showAnswer ? 'rotate-y-180' : ''}`}>
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-2xl shadow-md p-8 flex flex-col items-center justify-center text-center">
                      <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider absolute top-4 left-0 right-0">
                        {practiceSession.items[practiceSession.currentIndex].subjectName} &middot; {practiceSession.items[practiceSession.currentIndex].topicName}
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">
                        {practiceSession.items[practiceSession.currentIndex].front}
                      </h3>
                      <div className="absolute bottom-4 text-xs font-semibold text-slate-400">Click to flip</div>
                    </div>
                    
                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden bg-indigo-600 text-white border-2 border-indigo-700 rounded-2xl shadow-md p-8 flex flex-col items-center justify-center text-center rotate-y-180">
                      <h3 className="text-xl font-medium leading-relaxed">
                        {practiceSession.items[practiceSession.currentIndex].back}
                      </h3>
                    </div>
                  </div>
                </div>
              ) : (
                // Quiz UI
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-2">
                    {practiceSession.items[practiceSession.currentIndex].subjectName} &middot; {practiceSession.items[practiceSession.currentIndex].topicName}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-8">
                    {practiceSession.items[practiceSession.currentIndex].question}
                  </h3>
                  
                  <div className="space-y-3">
                    {practiceSession.items[practiceSession.currentIndex].options?.map((opt, idx) => {
                      const currentItem = practiceSession.items[practiceSession.currentIndex];
                      const answeredIdx = practiceSession.answered[currentItem.id];
                      const isAnswered = answeredIdx !== undefined;
                      const isCorrectOption = currentItem.correctOptionIndex === idx;
                      const isSelected = answeredIdx === idx;
                      
                      let btnClass = "w-full text-left p-4 rounded-xl border-2 font-medium transition-all ";
                      
                      if (!isAnswered) {
                        btnClass += "border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700";
                      } else if (isCorrectOption) {
                        btnClass += "border-green-500 bg-green-50 text-green-700";
                      } else if (isSelected && !isCorrectOption) {
                        btnClass += "border-red-500 bg-red-50 text-red-700";
                      } else {
                        btnClass += "border-slate-200 bg-slate-50 text-slate-400 opacity-50";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(idx)}
                          disabled={isAnswered}
                          className={btnClass}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt}</span>
                            {isAnswered && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            {isAnswered && isSelected && !isCorrectOption && <X className="h-5 w-5 text-red-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={handlePrev}
                  disabled={practiceSession.currentIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <div className="text-xs font-bold text-slate-400">
                  {practiceSession.currentIndex + 1} / {practiceSession.items.length}
                </div>
                {practiceSession.currentIndex === practiceSession.items.length - 1 ? (
                  <button
                    onClick={() => setPracticeSession(null)}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
                  >
                    Finish <CheckCircle2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                Add {showAddModal === 'flashcard' ? 'Flashcard' : 'Quiz Question'}
              </h3>
              <button onClick={() => setShowAddModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 overflow-y-auto flex-1">
              {/* Placement Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject *</label>
                  <select
                    required
                    value={newItem.subjectId || ''}
                    onChange={e => setNewItem({ ...newItem, subjectId: e.target.value, chapterId: '', topicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  >
                    <option value="">Select...</option>
                    {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Chapter *</label>
                  <select
                    required
                    disabled={!activeSubject}
                    value={newItem.chapterId || ''}
                    onChange={e => setNewItem({ ...newItem, chapterId: e.target.value, topicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50"
                  >
                    <option value="">Select...</option>
                    {activeSubject?.chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic *</label>
                  <select
                    required
                    disabled={!activeChapter}
                    value={newItem.topicId || ''}
                    onChange={e => setNewItem({ ...newItem, topicId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50"
                  >
                    <option value="">Select...</option>
                    {activeChapter?.topics?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Flashcard Fields */}
              {showAddModal === 'flashcard' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Front (Question / Concept) *</label>
                    <textarea
                      required
                      rows={3}
                      value={newItem.front || ''}
                      onChange={e => setNewItem({...newItem, front: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white resize-none"
                      placeholder="e.g. What is the powerhouse of the cell?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Back (Answer / Definition) *</label>
                    <textarea
                      required
                      rows={3}
                      value={newItem.back || ''}
                      onChange={e => setNewItem({...newItem, back: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white resize-none"
                      placeholder="e.g. Mitochondria"
                    />
                  </div>
                </div>
              )}

              {/* Quiz Fields */}
              {showAddModal === 'quiz' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Question *</label>
                    <textarea
                      required
                      rows={2}
                      value={newItem.question || ''}
                      onChange={e => setNewItem({...newItem, question: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white resize-none"
                      placeholder="Type the question here..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Options & Correct Answer *</label>
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map(idx => (
                        <div key={idx} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="correctOption"
                            required
                            checked={newItem.correctOptionIndex === idx}
                            onChange={() => setNewItem({...newItem, correctOptionIndex: idx})}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <input
                            type="text"
                            required
                            value={newItem.options?.[idx] || ''}
                            onChange={e => {
                              const newOptions = [...(newItem.options || ['', '', '', ''])];
                              newOptions[idx] = e.target.value;
                              setNewItem({...newItem, options: newOptions});
                            }}
                            className={`flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ${
                              newItem.correctOptionIndex === idx 
                                ? 'border-indigo-300 bg-indigo-50/50 focus:ring-indigo-500' 
                                : 'border-slate-300 bg-white focus:ring-slate-400'
                            }`}
                            placeholder={`Option ${idx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Save {showAddModal === 'flashcard' ? 'Flashcard' : 'Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                Bulk Upload
              </h3>
              <button onClick={() => { setShowBulkModal(false); setBulkError(''); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleBulkUpload} className="p-6 overflow-y-auto flex-1">
              {/* Placement Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject *</label>
                  <select
                    required
                    value={newItem.subjectId || ''}
                    onChange={e => setNewItem({ ...newItem, subjectId: e.target.value, chapterId: '', topicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  >
                    <option value="">Select...</option>
                    {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Chapter *</label>
                  <select
                    required
                    disabled={!activeSubject}
                    value={newItem.chapterId || ''}
                    onChange={e => setNewItem({ ...newItem, chapterId: e.target.value, topicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50"
                  >
                    <option value="">Select...</option>
                    {activeSubject?.chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic *</label>
                  <select
                    required
                    disabled={!activeChapter}
                    value={newItem.topicId || ''}
                    onChange={e => setNewItem({ ...newItem, topicId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50"
                  >
                    <option value="">Select...</option>
                    {activeChapter?.topics?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-3">Item Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={bulkType === 'flashcard'} onChange={() => setBulkType('flashcard')} className="text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium">Flashcards</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={bulkType === 'quiz'} onChange={() => setBulkType('quiz')} className="text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium">Quiz Questions</span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-2">
                  <div>
                    <p className="font-semibold mb-1">Format Instructions (Paste from Excel or CSV):</p>
                    {bulkType === 'flashcard' ? (
                      <p>One flashcard per line. Separate Front and Back using a comma or tab.<br/>Example: <code className="bg-white px-1 rounded text-blue-900 border border-blue-200">What is the powerhouse of the cell?, Mitochondria</code></p>
                    ) : (
                      <p>One question per line. Format: <code className="bg-white px-1 rounded text-blue-900 border border-blue-200">Question, Option1, Option2, Option3, Option4, CorrectIndex(0-3)</code><br/>Example: <code className="bg-white px-1 rounded text-blue-900 border border-blue-200">2+2=?, 2, 3, 4, 5, 2</code></p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-xs shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" /> {bulkType === 'flashcard' ? 'Flashcard' : 'Quiz'} Template
                  </button>
                </div>
              </div>

              <div>
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono text-sm whitespace-pre"
                  placeholder="Paste your content here..."
                />
              </div>

              {bulkError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {bulkError}
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowBulkModal(false); setBulkError(''); }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" /> Import Items
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
