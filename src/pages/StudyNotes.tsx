import React, { useState, useEffect } from 'react';
import { Paperclip, Plus, X, Search, Filter, ExternalLink, FileText, File as FileIcon, Link as LinkIcon, FileImage } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface StudyNote {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  subTopicId?: string;
  subTopicName?: string;
  title: string;
  type: string;
  link: string;
  dateAdded: string;
}

export default function StudyNotes() {
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // Syllabus data to populate dropdowns
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [activeFilterSubject, setActiveFilterSubject] = useState<string>('all');

  const [newNote, setNewNote] = useState<Partial<StudyNote>>({
    type: 'Google Drive'
  });

  useEffect(() => {
    const load = () => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));

    const savedNotes = localStorage.getItem('dugu_study_notes');
    if (savedNotes) setNotes(JSON.parse(savedNotes));
      };
    load();
    window.addEventListener('cloud_sync_update', load);
    return () => window.removeEventListener('cloud_sync_update', load);
  }, []);

  const saveNotes = (newNotes: StudyNote[]) => {
    setNotes(newNotes);
    localStorage.setItem('dugu_study_notes', JSON.stringify(newNotes));
  };

  const activeSubject = syllabus.find(s => s.id === newNote.subjectId);
  const activeChapter = activeSubject?.chapters?.find((c: any) => c.id === newNote.chapterId);
  const activeTopic = activeChapter?.topics?.find((t: any) => t.id === newNote.topicId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.subjectId || !newNote.chapterId || !newNote.topicId || !newNote.title || !newNote.link) return;

    const note: StudyNote = {
      id: Date.now().toString(),
      subjectId: newNote.subjectId,
      subjectName: activeSubject?.name || '',
      chapterId: newNote.chapterId,
      chapterName: activeChapter?.name || '',
      topicId: newNote.topicId,
      topicName: activeTopic?.name || '',
      subTopicId: newNote.subTopicId,
      subTopicName: activeTopic?.subTopics?.find((st: any) => st.id === newNote.subTopicId)?.name || '',
      title: newNote.title,
      type: newNote.type || 'Link',
      link: newNote.link,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    saveNotes([note, ...notes]);
    setShowAdd(false);
    setNewNote({
      type: 'Google Drive'
    });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="h-5 w-5 text-red-500" />;
      case 'PPT': return <FileImage className="h-5 w-5 text-orange-500" />;
      case 'Google Drive': return <FileIcon className="h-5 w-5 text-green-500" />;
      case 'OneDrive': return <FileIcon className="h-5 w-5 text-blue-500" />;
      default: return <LinkIcon className="h-5 w-5 text-slate-500" />;
    }
  };

  const filteredNotes = activeFilterSubject === 'all' 
    ? notes 
    : notes.filter(n => n.subjectId === activeFilterSubject);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Paperclip className="h-6 w-6 text-gray-500" /> Study Notes & Materials
          </h2>
          <p className="text-sm text-slate-500 mt-1">Organize shared links (Google Drive, OneDrive, PDFs, PPTs) by topic</p>
        </div>
        {!isStudent && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Material
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        <button
          onClick={() => setActiveFilterSubject('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            activeFilterSubject === 'all' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Subjects
        </button>
        {syllabus.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveFilterSubject(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              activeFilterSubject === s.id 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search materials..." 
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 bg-white"
              />
            </div>
            <button className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap w-12"></th>
                <th className="p-4 whitespace-nowrap">Material Title</th>
                <th className="p-4 whitespace-nowrap">Subject & Chapter</th>
                <th className="p-4 whitespace-nowrap">Topic Info</th>
                <th className="p-4 whitespace-nowrap">Type</th>
                <th className="p-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!filteredNotes.length ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                    No materials found. Click "Add Material" to get started.
                  </td>
                </tr>
              ) : (
                filteredNotes.map(note => (
                  <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center">
                      {getIconForType(note.type)}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-900">{note.title}</div>
                      <div className="text-[10px] text-slate-400">Added on {note.dateAdded}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">{note.subjectName}</div>
                      <div className="text-sm text-slate-700">{note.chapterName}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-slate-800">{note.topicName}</div>
                      {note.subTopicName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <div className="w-1 h-1 rounded-full bg-slate-400"></div> {note.subTopicName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {note.type}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <a 
                        href={note.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Open Link <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Add Study Material</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">
                <div className="sm:col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Location in Syllabus</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject *</label>
                  <select
                    required
                    value={newNote.subjectId || ''}
                    onChange={e => setNewNote({ ...newNote, subjectId: e.target.value, chapterId: '', topicId: '', subTopicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select Subject...</option>
                    {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Chapter *</label>
                  <select
                    required
                    disabled={!activeSubject}
                    value={newNote.chapterId || ''}
                    onChange={e => setNewNote({ ...newNote, chapterId: e.target.value, topicId: '', subTopicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Chapter...</option>
                    {activeSubject?.chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic *</label>
                  <select
                    required
                    disabled={!activeChapter}
                    value={newNote.topicId || ''}
                    onChange={e => setNewNote({ ...newNote, topicId: e.target.value, subTopicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Topic...</option>
                    {activeChapter?.topics?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Sub-topic (Optional)</label>
                  <select
                    disabled={!activeTopic || !activeTopic.subTopics?.length}
                    value={newNote.subTopicId || ''}
                    onChange={e => setNewNote({ ...newNote, subTopicId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select Sub-topic...</option>
                    {activeTopic?.subTopics?.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Material Details</h4>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Material Title *</label>
                  <input
                    type="text"
                    required
                    value={newNote.title || ''}
                    onChange={e => setNewNote({...newNote, title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Chapter 1 Summary Notes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Link Type</label>
                  <select
                    value={newNote.type || 'Google Drive'}
                    onChange={e => setNewNote({...newNote, type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="Google Drive">Google Drive</option>
                    <option value="OneDrive">OneDrive</option>
                    <option value="PDF">PDF Link</option>
                    <option value="PPT">PPT Link</option>
                    <option value="Link">Other Link</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Shared Link URL *</label>
                  <input
                    type="url"
                    required
                    value={newNote.link || ''}
                    onChange={e => setNewNote({...newNote, link: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
