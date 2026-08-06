import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Search, Filter, Trash2, Tag, AlertCircle, X, Edit3 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface TeamNote {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority: 'High' | 'Medium' | 'Low';
  category: 'General' | 'Student Issue' | 'Schedule' | 'Material';
}

export default function TeamNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  
  const [newNote, setNewNote] = useState<Partial<TeamNote>>({
    priority: 'Medium',
    category: 'General'
  });

  useEffect(() => {
    const savedNotes = localStorage.getItem('dugu_team_notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  const saveNotes = (updatedNotes: TeamNote[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('dugu_team_notes', JSON.stringify(updatedNotes));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title || !newNote.content) return;

    const note: TeamNote = {
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      author: user?.name || 'Unknown',
      date: new Date().toISOString(),
      priority: (newNote.priority as any) || 'Medium',
      category: (newNote.category as any) || 'General'
    };

    saveNotes([note, ...notes]);
    setShowAdd(false);
    setNewNote({
      priority: 'Medium',
      category: 'General'
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      saveNotes(notes.filter(n => n.id !== id));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Student Issue': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'Schedule': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Material': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
                         (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'All' || n.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-gray-500" /> Team Coordination Notes
          </h2>
          <p className="text-sm text-slate-500 mt-1">Real-time shared notes and announcements between teachers.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Note
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full bg-white"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full sm:w-auto"
              >
                <option value="All">All Categories</option>
                <option value="General">General</option>
                <option value="Student Issue">Student Issue</option>
                <option value="Schedule">Schedule</option>
                <option value="Material">Material</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <MessageSquare className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No notes found</h3>
          <p className="text-slate-500 mt-1 max-w-sm">
            {searchQuery || filterCategory !== 'All' 
              ? "No notes match your current filters. Try adjusting your search."
              : "There are no team notes yet. Be the first to start the conversation!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map(note => (
            <div key={note.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getPriorityColor(note.priority)}`}>
                      {note.priority} Priority
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getCategoryColor(note.category)} flex items-center gap-1`}>
                      <Tag className="h-3 w-3" /> {note.category}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{note.title}</h3>
                <p className="text-slate-600 text-sm whitespace-pre-wrap line-clamp-4">{note.content}</p>
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div>
                  <div className="text-xs font-bold text-slate-700">{note.author}</div>
                  <div className="text-[10px] text-slate-500">{new Date(note.date).toLocaleString()}</div>
                </div>
                {user?.name === note.author && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Add Team Note</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject / Title *</label>
                  <input
                    type="text"
                    required
                    value={newNote.title || ''}
                    onChange={e => setNewNote({...newNote, title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    placeholder="Brief description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Priority *</label>
                    <select
                      required
                      value={newNote.priority || 'Medium'}
                      onChange={e => setNewNote({...newNote, priority: e.target.value as any})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Category *</label>
                    <select
                      required
                      value={newNote.category || 'General'}
                      onChange={e => setNewNote({...newNote, category: e.target.value as any})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="General">General</option>
                      <option value="Student Issue">Student Issue</option>
                      <option value="Schedule">Schedule</option>
                      <option value="Material">Material</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Message Content *</label>
                  <textarea
                    required
                    rows={6}
                    value={newNote.content || ''}
                    onChange={e => setNewNote({...newNote, content: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white resize-none"
                    placeholder="Share information with the team..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
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
                  Post Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
