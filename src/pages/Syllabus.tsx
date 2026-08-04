import React, { useState, useEffect } from 'react';
import { Book, Plus, X, Search, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react';

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [showAddNode, setShowAddNode] = useState<{ type: 'chapter' | 'topic' | 'subtopic', parentId?: string } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');

  const [editNode, setEditNode] = useState<{ type: 'chapter' | 'topic' | 'subtopic', id: string, name: string } | null>(null);

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

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const newSubject: Subject = {
      id: Date.now().toString(),
      name: newSubjectName,
      chapters: [],
    };
    saveSubjects([...subjects, newSubject]);
    setNewSubjectName('');
    setShowAddSubject(false);
    setActiveSubjectId(newSubject.id);
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !showAddNode) return;

    const { type, parentId } = showAddNode;
    const newNode = { id: Date.now().toString(), name: newNodeName };

    const newSubjects = [...subjects];
    const subjectIndex = newSubjects.findIndex(s => s.id === activeSubjectId);
    
    if (subjectIndex === -1) return;
    
    const subject = newSubjects[subjectIndex];

    if (type === 'chapter') {
      subject.chapters.push({ ...newNode, topics: [] });
    } else if (type === 'topic' && parentId) {
      const chapter = subject.chapters.find(c => c.id === parentId);
      if (chapter) chapter.topics.push({ ...newNode, subTopics: [] });
      setExpandedNodes(prev => ({ ...prev, [parentId]: true }));
    } else if (type === 'subtopic' && parentId) {
      for (const chapter of subject.chapters) {
        const topic = chapter.topics.find(t => t.id === parentId);
        if (topic) {
          topic.subTopics.push(newNode);
          setExpandedNodes(prev => ({ ...prev, [parentId]: true }));
          break;
        }
      }
    }

    saveSubjects(newSubjects);
    setNewNodeName('');
    setShowAddNode(null);
  };

  const handleEditNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNode || !editNode.name.trim()) return;

    const newSubjects = [...subjects];
    const subjectIndex = newSubjects.findIndex(s => s.id === activeSubjectId);
    if (subjectIndex === -1) return;
    const subject = newSubjects[subjectIndex];

    if (editNode.type === 'chapter') {
      const chapter = subject.chapters.find(c => c.id === editNode.id);
      if (chapter) chapter.name = editNode.name;
    } else if (editNode.type === 'topic') {
      for (const chapter of subject.chapters) {
        const topic = chapter.topics.find(t => t.id === editNode.id);
        if (topic) topic.name = editNode.name;
      }
    } else if (editNode.type === 'subtopic') {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          const subtopic = topic.subTopics.find(st => st.id === editNode.id);
          if (subtopic) subtopic.name = editNode.name;
        }
      }
    }

    saveSubjects(newSubjects);
    setEditNode(null);
  };

  const deleteNode = (type: 'chapter' | 'topic' | 'subtopic', id: string) => {
    const newSubjects = [...subjects];
    const subjectIndex = newSubjects.findIndex(s => s.id === activeSubjectId);
    if (subjectIndex === -1) return;
    const subject = newSubjects[subjectIndex];

    if (type === 'chapter') {
      subject.chapters = subject.chapters.filter(c => c.id !== id);
    } else if (type === 'topic') {
      for (const chapter of subject.chapters) {
        chapter.topics = chapter.topics.filter(t => t.id !== id);
      }
    } else if (type === 'subtopic') {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          topic.subTopics = topic.subTopics.filter(st => st.id !== id);
        }
      }
    }
    saveSubjects(newSubjects);
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Book className="h-6 w-6 text-green-600" /> Syllabus Builder
          </h2>
          <p className="text-sm text-slate-500 mt-1">Define Chapters, Topics, and Sub-topics for each subject.</p>
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSubjectId(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              activeSubjectId === s.id 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.name}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeSubjectId === s.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
              {s.chapters.length}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowAddSubject(true)}
          className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Subject
        </button>
      </div>

      {showAddSubject && (
        <form onSubmit={handleAddSubject} className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-end gap-3 max-w-md">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New Subject Name</label>
            <input
              type="text"
              autoFocus
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              placeholder="e.g. History"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
            Add
          </button>
          <button type="button" onClick={() => setShowAddSubject(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-200">
            Cancel
          </button>
        </form>
      )}

      {/* Chapters Tree */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search syllabus..." 
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 bg-white"
            />
          </div>
          <button
            onClick={() => setShowAddNode({ type: 'chapter' })}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Chapter
          </button>
        </div>

        <div className="p-4">
          {!activeSubject?.chapters.length ? (
            <div className="text-center py-12 text-slate-500">
              <Book className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p>No syllabus defined for {activeSubject?.name} yet.</p>
              <p className="text-sm mt-1">Start by adding a Chapter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSubject.chapters.map(chapter => (
                <div key={chapter.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 p-3 flex items-center justify-between group">
                    <div className="flex items-center gap-2 cursor-pointer select-none flex-1" onClick={() => toggleNode(chapter.id)}>
                      {expandedNodes[chapter.id] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      <span className="font-bold text-slate-800">{chapter.name}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full ml-2">Chapter</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setShowAddNode({ type: 'topic', parentId: chapter.id })} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                        + Topic
                      </button>
                      <button onClick={() => setEditNode({ type: 'chapter', id: chapter.id, name: chapter.name })} className="text-slate-400 hover:text-indigo-600 p-1">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteNode('chapter', chapter.id)} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {expandedNodes[chapter.id] && (
                    <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
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
                              <button onClick={() => setShowAddNode({ type: 'subtopic', parentId: topic.id })} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                                + Sub-topic
                              </button>
                              <button onClick={() => setEditNode({ type: 'topic', id: topic.id, name: topic.name })} className="text-slate-400 hover:text-indigo-600 p-1">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteNode('topic', topic.id)} className="text-slate-400 hover:text-red-600 p-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
                                    <button onClick={() => setEditNode({ type: 'subtopic', id: sub.id, name: sub.name })} className="text-slate-400 hover:text-indigo-600 p-1 opacity-0 group-hover:opacity-100">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => deleteNode('subtopic', sub.id)} className="text-slate-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
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
