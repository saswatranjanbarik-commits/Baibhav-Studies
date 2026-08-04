import React, { useState, useEffect, useRef } from 'react';
import { Book, Plus, X, Search, ChevronDown, ChevronRight, Trash2, Pencil, Upload, CheckCircle2, Download } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface SubTopic {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subTopics: SubTopic[];
}

interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

const DEFAULT_SUBJECTS: Subject[] = [
  { id: '1', name: 'English', chapters: [] },
  { id: '2', name: 'Hindi', chapters: [] },
  { id: '3', name: 'Odia', chapters: [] },
  { id: '4', name: 'Mathematics', chapters: [] },
  { id: '5', name: 'Science', chapters: [] },
  { id: '6', name: 'Social Studies', chapters: [] },
  { id: '7', name: 'Computer Science', chapters: [] },
  { id: '8', name: 'Moral Science', chapters: [] },
  { id: '9', name: 'General Knowledge', chapters: [] },
];

export default function Syllabus() {
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [showAddNode, setShowAddNode] = useState<{ type: 'chapter' | 'topic' | 'subtopic', parentId?: string } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');

  const [editNode, setEditNode] = useState<{ type: 'chapter' | 'topic' | 'subtopic', id: string, name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dugu_syllabus_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSubjects(parsed);
      if (parsed.length > 0) setActiveSubjectId(parsed[0].id);
    } else {
      setSubjects(DEFAULT_SUBJECTS);
      setActiveSubjectId(DEFAULT_SUBJECTS[0].id);
    }
  }, []);

  const saveSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    localStorage.setItem('dugu_syllabus_v2', JSON.stringify(newSubjects));
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const newId = Date.now().toString();
    const newSubs = [...subjects, { id: newId, name: newSubjectName, chapters: [] }];
    saveSubjects(newSubs);
    setActiveSubjectId(newId);
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !activeSubject || !showAddNode) return;

    let updatedSubjects = [...subjects];
    const subIdx = updatedSubjects.findIndex(s => s.id === activeSubject.id);
    if (subIdx === -1) return;

    if (showAddNode.type === 'chapter') {
      updatedSubjects[subIdx].chapters.push({
        id: generateId(),
        name: newNodeName,
        topics: []
      });
    } else if (showAddNode.type === 'topic') {
      const chIdx = updatedSubjects[subIdx].chapters.findIndex(c => c.id === showAddNode.parentId);
      if (chIdx !== -1) {
        const newTopicId = generateId();
        updatedSubjects[subIdx].chapters[chIdx].topics.push({
          id: newTopicId,
          name: newNodeName,
          subTopics: []
        });
        setExpandedNodes(prev => ({ ...prev, [showAddNode.parentId as string]: true }));
      }
    } else if (showAddNode.type === 'subtopic') {
      let found = false;
      updatedSubjects[subIdx].chapters.forEach(ch => {
        const tIdx = ch.topics.findIndex(t => t.id === showAddNode.parentId);
        if (tIdx !== -1) {
          ch.topics[tIdx].subTopics.push({
            id: generateId(),
            name: newNodeName
          });
          found = true;
          setExpandedNodes(prev => ({ ...prev, [showAddNode.parentId as string]: true }));
        }
      });
    }

    saveSubjects(updatedSubjects);
    setNewNodeName('');
    setShowAddNode(null);
  };

  const handleEditNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNode || !editNode.name.trim() || !activeSubject) return;

    let updatedSubjects = [...subjects];
    const subIdx = updatedSubjects.findIndex(s => s.id === activeSubject.id);

    if (editNode.type === 'chapter') {
      const idx = updatedSubjects[subIdx].chapters.findIndex(c => c.id === editNode.id);
      if (idx !== -1) updatedSubjects[subIdx].chapters[idx].name = editNode.name;
    } else if (editNode.type === 'topic') {
      updatedSubjects[subIdx].chapters.forEach(ch => {
        const idx = ch.topics.findIndex(t => t.id === editNode.id);
        if (idx !== -1) ch.topics[idx].name = editNode.name;
      });
    } else if (editNode.type === 'subtopic') {
      updatedSubjects[subIdx].chapters.forEach(ch => {
        ch.topics.forEach(t => {
          const idx = t.subTopics.findIndex(st => st.id === editNode.id);
          if (idx !== -1) t.subTopics[idx].name = editNode.name;
        });
      });
    }

    saveSubjects(updatedSubjects);
    setEditNode(null);
  };

  const deleteNode = (type: 'chapter' | 'topic' | 'subtopic', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    let updatedSubjects = [...subjects];
    const subIdx = updatedSubjects.findIndex(s => s.id === activeSubjectId);

    if (type === 'chapter') {
      updatedSubjects[subIdx].chapters = updatedSubjects[subIdx].chapters.filter(c => c.id !== id);
    } else if (type === 'topic') {
      updatedSubjects[subIdx].chapters.forEach(ch => {
        ch.topics = ch.topics.filter(t => t.id !== id);
      });
    } else if (type === 'subtopic') {
      updatedSubjects[subIdx].chapters.forEach(ch => {
        ch.topics.forEach(t => {
          t.subTopics = t.subTopics.filter(st => st.id !== id);
        });
      });
    }

    saveSubjects(updatedSubjects);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      if (csv) {
        processCSV(csv);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processCSV = (csv: string) => {
    const lines = csv.split("\n").filter(line => line.trim() !== "");
    if (lines.length < 2) {
      alert("Invalid CSV format or empty file.");
      return;
    }
    
    let currentSyllabus = [...subjects];
    let newPlanEntries: any[] = [];
    
    const getOrCreateSubject = (name: string) => {
      let sub = currentSyllabus.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (!sub) {
        sub = { id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, chapters: [] };
        currentSyllabus.push(sub);
      }
      return sub;
    };

    const getOrCreateChapter = (sub: any, name: string) => {
      let ch = sub.chapters.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
      if (!ch) {
        ch = { id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, topics: [] };
        sub.chapters.push(ch);
      }
      return ch;
    };

    const getOrCreateTopic = (ch: any, name: string) => {
      let tp = ch.topics.find((t: any) => t.name.toLowerCase() === name.toLowerCase());
      if (!tp) {
        tp = { id: `tp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, subTopics: [] };
        ch.topics.push(tp);
      }
      return tp;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
      if (parts.length < 5) continue;
      
      const startDate = parts[0] || new Date().toISOString().split("T")[0];
      const weekNo = parts[1] || "1";
      const subjectName = parts[2] || "Unknown Subject";
      const planType = parts[3] || "Self Study";
      const rawTopic = parts[4] || "General";
      const statusRaw = (parts[5] || "Pending").toLowerCase();
      const status = statusRaw.includes("complete") ? "Completed" : statusRaw.includes("progress") ? "In Progress" : "Pending";
      const learningIndex = parts[6] || "1.1";
      const doubts = parts[7] || "";

      let chapterName = "General Chapter";
      let topicName = rawTopic;

      if (rawTopic.includes("-")) {
        const split = rawTopic.split("-");
        chapterName = split[0].trim();
        topicName = split.slice(1).join("-").trim();
      }

      const subject = getOrCreateSubject(subjectName);
      const chapter = getOrCreateChapter(subject, chapterName);
      const topic = getOrCreateTopic(chapter, topicName);

      newPlanEntries.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        subjectId: subject.id,
        subjectName: subject.name,
        chapterId: chapter.id,
        chapterName: chapter.name,
        topicId: topic.id,
        topicName: topic.name,
        status,
        startDate,
        planType,
        weekNo,
        learningIndex,
        doubts
      });
    }

    saveSubjects(currentSyllabus);
    if (newPlanEntries.length > 0) {
      const savedEntries = localStorage.getItem("dugu_study_plan");
      const existingEntries = savedEntries ? JSON.parse(savedEntries) : [];
      localStorage.setItem("dugu_study_plan", JSON.stringify([...newPlanEntries, ...existingEntries]));
    }
    
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };

  const handleDownloadTemplate = () => {
    const csvContent = [
      "Date,Week Number,Subject,Plan Type,Chapter - Topic,Status,Learning Index,Doubts",
      "2026-08-01,1,Mathematics,Self Study,Algebra - Equations,Completed,1.1,",
      "2026-08-02,1,Science,Quiz,Physics - Motion,Pending,1.2,Need help with velocity"
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "dugu_syllabus_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Book className="h-6 w-6 text-green-600" /> Syllabus Builder
          </h2>
          <p className="text-sm text-slate-500 mt-1">Define Chapters, Topics, and Sub-topics for each subject.</p>
        </div>
        {!isStudent && (
          <div className="flex gap-3">
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 shadow-sm flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" /> CSV Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-colors"
            >
              <Upload className="h-4 w-4" /> Import CSV
            </button>
            <button
              onClick={() => setShowAddSubject(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Subject
            </button>
          </div>
        )}
      </div>

      {importSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div className="font-semibold text-sm">Successfully imported CSV and updated syllabus & study plan!</div>
        </div>
      )}

      {/* Subject Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSubjectId(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              activeSubjectId === s.id 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[500px]">
        {/* Active Subject Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{activeSubject?.name || "Select a subject"}</h3>
            <p className="text-sm text-slate-500">{activeSubject?.chapters.length || 0} Chapters in this subject</p>
          </div>
          {!isStudent && activeSubject && (
            <button 
              onClick={() => setShowAddNode({ type: 'chapter' })}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Chapter
            </button>
          )}
        </div>

        {/* Tree View */}
        <div className="p-4 sm:p-6">
          {!activeSubject?.chapters.length ? (
            <div className="text-center py-12">
              <Book className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No chapters added yet.</p>
              {!isStudent && <p className="text-sm text-slate-400 mt-1">Click "Add Chapter" to get started.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {activeSubject.chapters.map(chapter => (
                <div key={chapter.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3 cursor-pointer select-none flex-1" onClick={() => toggleNode(chapter.id)}>
                      {expandedNodes[chapter.id] ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                      <span className="font-bold text-slate-800">{chapter.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-2">Chapter</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isStudent && (
                        <>
                          <button onClick={() => setShowAddNode({ type: 'topic', parentId: chapter.id })} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                            + Topic
                          </button>
                          <button onClick={() => setEditNode({ type: 'chapter', id: chapter.id, name: chapter.name })} className="text-slate-400 hover:text-indigo-600 p-1.5">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteNode('chapter', chapter.id)} className="text-slate-400 hover:text-red-600 p-1.5">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {expandedNodes[chapter.id] && (
                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                      {!chapter.topics.length && <p className="text-xs text-slate-400 italic pl-6">No topics added.</p>}
                      {chapter.topics.map(topic => (
                        <div key={topic.id} className="ml-6">
                          <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md group border border-transparent hover:border-slate-100">
                            <div className="flex items-center gap-2 cursor-pointer select-none flex-1" onClick={() => toggleNode(topic.id)}>
                              {expandedNodes[topic.id] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                              <span className="font-semibold text-slate-700 text-sm">{topic.name}</span>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">Topic</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isStudent && (
                                <>
                                  <button onClick={() => setShowAddNode({ type: 'subtopic', parentId: topic.id })} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                                    + Sub-topic
                                  </button>
                                  <button onClick={() => setEditNode({ type: 'topic', id: topic.id, name: topic.name })} className="text-slate-400 hover:text-indigo-600 p-1">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => deleteNode('topic', topic.id)} className="text-slate-400 hover:text-red-600 p-1">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {expandedNodes[topic.id] && (
                            <div className="ml-8 mt-1 space-y-1">
                              {!topic.subTopics.length && <p className="text-[11px] text-slate-400 italic p-1">No sub-topics added.</p>}
                              {topic.subTopics.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md group text-sm border border-transparent hover:border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                    <span className="text-slate-600">{sub.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {!isStudent && (
                                      <>
                                        <button onClick={() => setEditNode({ type: 'subtopic', id: sub.id, name: sub.name })} className="text-slate-400 hover:text-indigo-600 p-1 opacity-0 group-hover:opacity-100">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => deleteNode('subtopic', sub.id)} className="text-slate-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Node / Subject Modals... */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Add Subject</h3>
              <button onClick={() => setShowAddSubject(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubject} className="p-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter subject name..."
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {showAddNode && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 capitalize">Add {showAddNode.type}</h3>
              <button onClick={() => setShowAddNode(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddNode} className="p-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 capitalize">{showAddNode.type} Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newNodeName}
                  onChange={e => setNewNodeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={`Enter ${showAddNode.type} name...`}
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddNode(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm capitalize"
                >
                  Save {showAddNode.type}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Node Modal */}
      {editNode && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 capitalize">Edit {editNode.type}</h3>
              <button onClick={() => setEditNode(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditNode} className="p-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 capitalize">{editNode.type} Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editNode.name}
                  onChange={e => setEditNode({ ...editNode, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={`Enter ${editNode.type} name...`}
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditNode(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm capitalize"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
