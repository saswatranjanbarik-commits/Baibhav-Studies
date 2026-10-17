import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Plus, Search, Filter, CheckCircle2, Circle, Calendar, Trash2, X, AlertCircle, Tag, Clock, Link as LinkIcon, FileText, Upload } from 'lucide-react';
import { todayStr, parseDateStr } from '../lib/dates';
import { Camera, MessageSquareText, HardDrive, Download, Eraser, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import ScanCapture from '../components/scan/ScanCapture';
import ScanGallery from '../components/scan/ScanGallery';
import { deleteScanPages, downloadPagesAsPdf } from '../lib/scans';
import {
  Submission, listenToSubmissions, addPages, saveSubmission, confirmSubmission, removeSubmissionFiles,
  deleteSubmission, formatBytes,
} from '../lib/submissions';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed';
  category: 'Homework' | 'Revision' | 'Project' | 'General';
  subjectId?: string;
  subjectName?: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  referenceLink?: string;
  referenceFileName?: string;
  submissionLink?: string;
  submissionFileName?: string;
  // ---- v1.5 (optional, additive) ----
  /** Scanned/uploaded pages of the submitted work (see lib/scans.ts). */
  scanIds?: string[];
  submittedBy?: string;
  submittedAt?: string;
  /** Tutor feedback on the submission. */
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

/** A link was saved (old "Upload File" stored only "#" + a file name — no file). */
const hasRealLink = (t: Task) => !!t.submissionLink && t.submissionLink !== '#';

/**
 * The task's scanned submission. New submissions live in their own cloud
 * record (lib/submissions.ts); early v1.5 test submissions were stored on the
 * task itself — both are shown.
 */
function submissionOf(t: Task, subs: Record<string, Submission>): Submission | undefined {
  if (subs[t.id]) return subs[t.id];
  if (t.scanIds?.length) {
    return {
      taskId: t.id, scanIds: t.scanIds, pages: t.scanIds.length, bytes: 0,
      submittedBy: t.submittedBy || '', submittedByEmail: '', submittedAt: t.submittedAt || '',
      reviewNote: t.reviewNote, reviewedBy: t.reviewedBy, reviewedAt: t.reviewedAt,
    };
  }
  return undefined;
}

export default function Tasks() {
  const { currentUser } = useAuth();
  const isStudent = currentUser?.role === 'Student';
  /** v1.5: task whose work is being scanned (camera / photos / PDF). */
  const [scanTask, setScanTask] = useState<Task | null>(null);
  /** v1.5: tutor feedback being typed, per task. */
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  /** v1.5: submissions, live from the cloud. */
  const [subs, setSubs] = useState<Record<string, Submission>>({});
  const [subsError, setSubsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [working, setWorking] = useState<string | null>(null); // task id being processed
  useEffect(() => listenToSubmissions((s) => { setSubs(s); setSubsError(null); }, setSubsError), []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');

  const [submitModalTask, setSubmitModalTask] = useState<Task | null>(null);
  const [submissionLinkInput, setSubmissionLinkInput] = useState('');
  const [submissionFileInput, setSubmissionFileInput] = useState<File | null>(null);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    priority: 'Medium',
    status: 'Pending',
    category: 'General',
    dueDate: todayStr(),
    subjectId: '',
    chapterId: '',
    topicId: '',
    referenceLink: '',
    referenceFileName: ''
  });

  useEffect(() => {
    const load = () => {
    const savedTasks = localStorage.getItem('dugu_tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));

    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));
      };
    load();
    window.addEventListener('cloud_sync_update', load);
    return () => window.removeEventListener('cloud_sync_update', load);
  }, []);

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('dugu_tasks', JSON.stringify(newTasks));
  };

  const activeSubject = syllabus.find(s => s.id === newTask.subjectId);
  const activeChapter = activeSubject?.chapters?.find((c: any) => c.id === newTask.chapterId);
  const activeTopic = activeChapter?.topics?.find((t: any) => t.id === newTask.topicId);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || '',
      dueDate: newTask.dueDate || todayStr(),
      priority: newTask.priority as any,
      status: newTask.status as any,
      category: newTask.category as any,
      referenceLink: newTask.referenceLink,
      referenceFileName: newTask.referenceFileName,
    };

    if (activeSubject) {
      task.subjectId = activeSubject.id;
      task.subjectName = activeSubject.name;
    }
    if (activeChapter) {
      task.chapterId = activeChapter.id;
      task.chapterName = activeChapter.name;
    }
    if (activeTopic) {
      task.topicId = activeTopic.id;
      task.topicName = activeTopic.name;
    }

    saveTasks([task, ...tasks]);
    setShowAddModal(false);
    setNewTask({
      priority: 'Medium',
      status: 'Pending',
      category: 'General',
      dueDate: todayStr(),
      subjectId: '',
      chapterId: '',
      topicId: '',
      referenceLink: '',
      referenceFileName: ''
    });
  };

  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalTask) return;
    
    const linkToSave = submissionFileInput ? '#' : submissionLinkInput;
    const fileNameToSave = submissionFileInput ? submissionFileInput.name : '';

    if (!linkToSave && !fileNameToSave) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === submitModalTask.id) {
        return { 
          ...t, 
          submissionLink: linkToSave,
          submissionFileName: fileNameToSave,
          status: 'Completed'
        };
      }
      return t;
    });
    
    saveTasks(updatedTasks as Task[]);
    setSubmitModalTask(null);
    setSubmissionLinkInput('');
    setSubmissionFileInput(null);
  };

  const toggleTaskStatus = (task: Task) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        let nextStatus: 'Pending' | 'In Progress' | 'Completed' = 'Pending';
        if (t.status === 'Pending') nextStatus = 'In Progress';
        else if (t.status === 'In Progress') nextStatus = 'Completed';
        else nextStatus = 'Pending';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    saveTasks(updatedTasks as Task[]);
  };

  // Repair (tutor/admin, once per visit): a task with submitted work must be
  // marked Completed in the task list too (fixes tasks whose status update
  // was lost before v1.5's merge fix).
  const repaired = useRef(false);
  useEffect(() => {
    if (isStudent || repaired.current || !tasks.length || !Object.keys(subs).length) return;
    const stale = tasks.filter(t => subs[t.id] && t.status !== 'Completed');
    repaired.current = true;
    if (stale.length) saveTasks(tasks.map(t => (subs[t.id] && t.status !== 'Completed' ? { ...t, status: 'Completed' } : t)));
  }, [tasks, subs, isStudent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    const sub = task ? submissionOf(task, subs) : undefined;
    const pages = sub?.scanIds.length || 0;
    if (confirm(pages ? `Delete this task and its ${pages} submitted page(s)?` : 'Are you sure you want to delete this task?')) {
      saveTasks(tasks.filter(t => t.id !== id));
      if (subs[id]) deleteSubmission(subs[id]).catch((e) => console.warn(e));
      else if (task?.scanIds?.length) deleteScanPages(task.scanIds);
    }
  };

  const myName = currentUser?.username || currentUser?.email || '';

  /**
   * v1.5: pages saved → record the submission DIRECTLY in the cloud (waits for
   * confirmation), then mark the task completed. If this throws, the scan
   * screen stays open with an error, so nothing is silently lost.
   */
  const attachScans = async (task: Task, scanIds: string[], bytes: number) => {
    await addPages(submissionOf(task, subs), task.id, scanIds, bytes, { name: myName, email: currentUser?.email || '' });
    const ok = await confirmSubmission(task.id);
    const latest = tasks.find(t => t.id === task.id) || task;
    if (latest.status !== 'Completed') saveTasks(tasks.map(t => t.id === task.id ? { ...latest, status: 'Completed' } : t));
    setScanTask(null);
    setNotice(ok
      ? `✓ Submitted and saved: ${scanIds.length} page(s) for "${task.title}". Your tutor can see it now.`
      : `Saved on this device — it will reach your tutor when the connection is back.`);
  };

  /** v1.5: tutor feedback / reviewed (saved straight to the submission record). */
  const saveReview = async (task: Task) => {
    const sub = submissionOf(task, subs);
    if (!sub) return;
    const note = (feedback[task.id] ?? sub.reviewNote ?? '').trim();
    setWorking(task.id);
    try {
      await saveSubmission({ ...sub, reviewNote: note, reviewedBy: myName, reviewedAt: new Date().toISOString() });
      setFeedback(f => { const c = { ...f }; delete c[task.id]; return c; });
    } catch (e) {
      console.warn(e);
      setNotice('Could not save the feedback. Check the connection.');
    } finally {
      setWorking(null);
    }
  };

  /** v1.5: download all pages of a submission as one PDF. */
  const downloadPdf = async (task: Task) => {
    const sub = submissionOf(task, subs);
    if (!sub?.scanIds.length) return 0;
    setWorking(task.id);
    try {
      return await downloadPagesAsPdf(sub.scanIds, `${task.title}${sub.submittedBy ? ' - ' + sub.submittedBy : ''}`);
    } finally {
      setWorking(null);
    }
  };

  /** v1.5: free the space — delete the pages, keep the task completed. */
  const freeSpace = async (task: Task, alreadyDownloaded = false) => {
    const sub = submissionOf(task, subs);
    if (!sub?.scanIds.length) return;
    if (!alreadyDownloaded && !confirm(`Remove the ${sub.scanIds.length} page(s) of "${task.title}" from EduTrack to free space?\n\nDownload the PDF first if you want to keep a copy. The task stays marked as completed.`)) return;
    setWorking(task.id);
    try {
      await removeSubmissionFiles(sub, myName);
      if (task.scanIds?.length) saveTasks(tasks.map(t => t.id === task.id ? { ...t, scanIds: [] } : t));
      if (task.status !== 'Completed') saveTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'Completed' } : t));
      setNotice(`Space freed for "${task.title}". The task stays completed.`);
    } catch (e) {
      console.warn(e);
      setNotice('Could not remove the pages. Check the connection.');
    } finally {
      setWorking(null);
    }
  };

  const downloadThenFree = async (task: Task) => {
    const n = await downloadPdf(task);
    if (n && confirm(`The PDF has been downloaded. Check it opened correctly, then press OK to remove the pages from EduTrack (the task stays completed).`)) {
      await freeSpace(task, true);
    }
  };

  // Tasks as shown: a submitted task counts as completed even before its
  // status change has synced.
  const viewTasks = tasks.map(t => (submissionOf(t, subs) && t.status !== 'Completed' ? { ...t, status: 'Completed' as const } : t));
  const storedSubs = tasks
    .map(t => ({ task: t, sub: submissionOf(t, subs) }))
    .filter((x): x is { task: Task; sub: Submission } => !!x.sub && x.sub.scanIds.length > 0)
    .sort((a, b) => (a.sub.submittedAt || '').localeCompare(b.sub.submittedAt || ''));
  const storedBytes = storedSubs.reduce((n, x) => n + (x.sub.bytes || 0), 0);

  const filteredTasks = viewTasks.filter(t => {
    const matchesSearch = (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
                         (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-700 bg-red-50 border-red-200';
      case 'Medium': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Low': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Homework': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Revision': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'Project': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'Completed') return false;
    const today = todayStr();
    return dueDate < today;
  };

  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const subject = task.subjectName || 'General';
    const chapter = task.chapterName || 'Uncategorized';
    if (!acc[subject]) acc[subject] = {};
    if (!acc[subject][chapter]) acc[subject][chapter] = [];
    acc[subject][chapter].push(task);
    return acc;
  }, {} as Record<string, Record<string, Task[]>>);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-green-500" /> Tasks & Assignments
          </h2>
          <p className="text-sm text-slate-500 mt-1">Track homework, projects, and upcoming deadlines.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        {/* v1.5: storage used by submitted pages + clean-up (tutor/admin) */}
        {!isStudent && (
          <button
            onClick={() => setShowCleanup(true)}
            className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-2"
            title="See how much space submitted pages use, download them as PDF, free space"
          >
            <HardDrive className="h-4 w-4" /> Submissions: {formatBytes(storedBytes)}
          </button>
        )}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
        </div>
      </div>

      {/* v1.5: submission messages */}
      {notice && (
        <div className="mb-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 py-2 flex items-start gap-2">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
      )}
      {subsError && <div className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">{subsError}</div>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full bg-white"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white flex-1 sm:flex-none"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white flex-1 sm:flex-none"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {!filteredTasks.length ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <CheckSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No tasks found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            {searchQuery || filterStatus !== 'All' || filterPriority !== 'All' 
              ? "No tasks match your current filters. Try adjusting them."
              : "You have no tasks yet. Add a new task to get started!"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTasks).map(([subject, chapters]) => (
            <div key={subject} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block"></span>
                {subject}
              </h3>
              
              <div className="space-y-6">
                {Object.entries(chapters).map(([chapter, chapterTasks]) => (
                  <div key={chapter}>
                    {chapter !== 'Uncategorized' && (
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">{chapter}</h4>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {chapterTasks.map(task => (
                        <div 
                          key={task.id} 
                          className={`border rounded-xl p-5 relative group transition-all duration-200 ${
                            task.status === 'Completed' 
                              ? 'bg-slate-50 border-slate-200' 
                              : 'bg-white border-slate-200 hover:shadow-md hover:border-indigo-200'
                          }`}
                        >
                          <button 
                            onClick={() => handleDelete(task.id)}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          
                          <div className="flex items-start gap-3 mb-3 pr-8">
                            <button 
                              onClick={() => toggleTaskStatus(task)}
                              className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              {task.status === 'Completed' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : task.status === 'In Progress' ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
                                </svg>
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #TSK-{task.id.slice(-4)}
                                </span>
                                <h3 className={`text-base font-bold ${
                                  task.status === 'Completed' ? 'text-slate-500 line-through' : 'text-slate-900'
                                }`}>
                                  {task.title}
                                </h3>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2 mt-2">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getCategoryColor(task.category)}`}>
                                  <Tag className="h-3 w-3" /> {task.category}
                                </span>
                                {task.status === 'In Progress' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-700 border-amber-200">
                                    <Clock className="h-3 w-3" /> In Progress
                                  </span>
                                )}
                              </div>
                              {task.topicName && (
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                  Topic: {task.topicName}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {task.description && (
                            <p className={`text-sm mb-4 pl-8 line-clamp-3 ${
                              task.status === 'Completed' ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              {task.description}
                            </p>
                          )}
            
                          {(task.referenceLink || task.referenceFileName) && (
                            <div className="pl-8 mb-4">
                              <a href={task.referenceLink || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md border border-blue-200 transition-colors">
                                <FileText className="h-3.5 w-3.5" />
                                {task.referenceFileName || 'View Reference Material'}
                              </a>
                            </div>
                          )}
                          
                          <SubmissionBlock
                            task={task}
                            sub={submissionOf(task, subs)}
                            isStudent={isStudent}
                            busy={working === task.id}
                            feedbackText={feedback[task.id]}
                            onFeedback={(v) => setFeedback(f => ({ ...f, [task.id]: v }))}
                            onScan={() => setScanTask(task)}
                            onLink={() => setSubmitModalTask(task)}
                            onReview={() => saveReview(task)}
                            onPdf={() => downloadPdf(task)}
                            onFree={() => freeSpace(task)}
                          />

                          <div className="pl-8 flex items-center gap-2 mt-auto">
                            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                              isOverdue(task.dueDate, task.status) 
                                ? 'text-red-700 bg-red-50 border-red-200' 
                                : task.status === 'Completed'
                                  ? 'text-slate-500 bg-slate-100 border-slate-200'
                                  : 'text-slate-600 bg-slate-50 border-slate-200'
                            }`}>
                              {isOverdue(task.dueDate, task.status) ? (
                                <AlertCircle className="h-3.5 w-3.5" />
                              ) : (
                                <Calendar className="h-3.5 w-3.5" />
                              )}
                              {task.status === 'Completed' ? 'Completed' : (isOverdue(task.dueDate, task.status) ? 'Overdue: ' : 'Due: ')}
                              {parseDateStr(task.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                Add New Task
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTask.title || ''}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  placeholder="What needs to be done?"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newTask.description || ''}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm resize-none"
                  placeholder="Add any additional details here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newTask.dueDate || ''}
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Category *</label>
                  <select
                    required
                    value={newTask.category || 'General'}
                    onChange={e => setNewTask({...newTask, category: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  >
                    <option value="General">General</option>
                    <option value="Homework">Homework</option>
                    <option value="Project">Project</option>
                    <option value="Revision">Revision</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Priority *</label>
                  <select
                    required
                    value={newTask.priority || 'Medium'}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Status *</label>
                  <select
                    required
                    value={newTask.status || 'Pending'}
                    onChange={e => setNewTask({...newTask, status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject</label>
                  <select
                    value={newTask.subjectId || ''}
                    onChange={e => setNewTask({ ...newTask, subjectId: e.target.value, chapterId: '', topicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  >
                    <option value="">None...</option>
                    {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Chapter</label>
                  <select
                    disabled={!activeSubject}
                    value={newTask.chapterId || ''}
                    onChange={e => setNewTask({ ...newTask, chapterId: e.target.value, topicId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50"
                  >
                    <option value="">None...</option>
                    {activeSubject?.chapters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Topic</label>
                  <select
                    disabled={!activeChapter}
                    value={newTask.topicId || ''}
                    onChange={e => setNewTask({ ...newTask, topicId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm disabled:bg-slate-50"
                  >
                    <option value="">None...</option>
                    {activeChapter?.topics?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Reference Material (PDF / Google Drive Link)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      value={newTask.referenceLink || ''}
                      onChange={e => setNewTask({...newTask, referenceLink: e.target.value})}
                      placeholder="Paste cloud link..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                    />
                  </div>
                  <div className="relative shrink-0">
                    <input 
                      type="file" 
                      id="upload-ref" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNewTask({
                            ...newTask, 
                            referenceFileName: e.target.files[0].name,
                            referenceLink: '#' // Placeholder for real upload logic
                          });
                        }
                      }}
                    />
                    <label htmlFor="upload-ref" className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors border border-slate-200">
                      <Upload className="h-4 w-4" /> Upload PDF
                    </label>
                  </div>
                </div>
                {newTask.referenceFileName && (
                  <p className="mt-2 text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {newTask.referenceFileName} attached
                  </p>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Task Modal */}
      {submitModalTask && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                Submit Work
              </h3>
              <button onClick={() => { setSubmitModalTask(null); setSubmissionLinkInput(''); setSubmissionFileInput(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitWork} className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                Submit your work for <strong>{submitModalTask.title}</strong> by pasting a cloud link, or scan the pages.
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Submission Link (Google Drive / OneDrive)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    disabled={!!submissionFileInput}
                    value={submissionLinkInput}
                    onChange={e => setSubmissionLinkInput(e.target.value)}
                    placeholder="Paste your link here..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500 font-medium">OR</span>
                </div>
              </div>

              {/* v1.5: real file saving — scan pages or upload photos / a small PDF */}
              <button
                type="button"
                onClick={() => { const t = submitModalTask; setSubmitModalTask(null); setSubmissionLinkInput(''); setScanTask(t); }}
                className="w-full border-2 border-dashed border-indigo-300 rounded-xl p-5 text-center hover:bg-indigo-50 transition-colors flex flex-col items-center"
              >
                <Camera className="h-8 w-8 text-indigo-500 mb-2" />
                <span className="text-sm font-semibold text-slate-700">Scan pages or upload photos / PDF</span>
                <span className="text-xs text-slate-500 mt-1">Opens the camera on a tablet or phone</span>
              </button>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setSubmitModalTask(null); setSubmissionLinkInput(''); setSubmissionFileInput(null); }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!submissionLinkInput}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> Submit Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCleanup && (
        <CleanupModal
          items={storedSubs}
          workingId={working}
          onClose={() => setShowCleanup(false)}
          onPdf={(t) => downloadPdf(t)}
          onDownloadAndFree={(t) => downloadThenFree(t)}
          onFree={(t) => freeSpace(t)}
          onDelete={(t) => handleDelete(t.id)}
          oldCompleted={viewTasks.filter(t => t.status === 'Completed' && t.dueDate && t.dueDate < addDaysStr(-30))}
        />
      )}

      {/* v1.5: scan & submit */}
      {scanTask && currentUser && (
        <ScanCapture
          user={currentUser}
          title="Scan & submit work"
          subtitle={scanTask.title}
          context={{ type: 'task', id: scanTask.id }}
          sendLabel="Submit"
          onClose={() => setScanTask(null)}
          onDone={(ids, _caption, bytes) => attachScans(scanTask, ids, bytes)}
        />
      )}
    </div>
  );
}


/** "YYYY-MM-DD" n days from today (negative = past). */
function addDaysStr(n: number): string {
  const d = parseDateStr(todayStr());
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

// ---------------------------------------------------------------------------
// v1.5: the submission part of a task card
// ---------------------------------------------------------------------------

function SubmissionBlock({ task, sub, isStudent, busy, feedbackText, onFeedback, onScan, onLink, onReview, onPdf, onFree }: {
  task: Task; sub?: Submission; isStudent: boolean; busy: boolean; feedbackText?: string;
  onFeedback: (v: string) => void; onScan: () => void; onLink: () => void; onReview: () => void;
  onPdf: () => void; onFree: () => void;
}) {
  const pages = sub?.scanIds.length || 0;
  const submitted = !!sub || hasRealLink(task);
  return (
    <div className="pl-8 mb-4 space-y-2">
      {pages > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Submitted · {pages} page{pages === 1 ? '' : 's'}{sub!.bytes ? ` · ${formatBytes(sub!.bytes)}` : ''}
          </span>
          <ScanGallery scanIds={sub!.scanIds} downloadName={task.title} />
          <span className="text-[11px] text-slate-400">by {sub!.submittedBy || 'student'}{sub!.submittedAt ? ` · ${fmtDate(sub!.submittedAt)}` : ''}</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={onPdf} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 px-2 py-1 rounded-md disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download PDF
            </button>
            {!isStudent && (
              <button onClick={onFree} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-red-50 hover:text-red-700 px-2 py-1 rounded-md disabled:opacity-50" title="Delete the pages to save space — the task stays completed">
                <Eraser className="h-3.5 w-3.5" /> Free space
              </button>
            )}
          </div>
        </div>
      )}
      {sub && pages === 0 && sub.filesRemovedAt && (
        <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1">
          ✓ Submitted by {sub.submittedBy || 'student'}{sub.submittedAt ? ` on ${fmtDate(sub.submittedAt)}` : ''}. {sub.pagesRemoved || ''} page(s) removed to save space on {fmtDate(sub.filesRemovedAt)} by {sub.filesRemovedBy}.
        </div>
      )}
      {hasRealLink(task) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted link</span>
          <a href={task.submissionLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md border border-emerald-200 w-fit transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {task.submissionFileName || 'View Submission'}
          </a>
        </div>
      )}
      {!hasRealLink(task) && task.submissionFileName && !sub && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          "{task.submissionFileName}" was chosen earlier, but older versions of the app didn't save the file itself. Please submit it again with Scan.
        </div>
      )}
      {!submitted ? (
        <div className="flex flex-wrap gap-2">
          <button onClick={onScan} className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md transition-colors">
            <Camera className="h-3.5 w-3.5" /> Scan &amp; submit
          </button>
          <button onClick={onLink} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-md border border-transparent hover:border-indigo-200 transition-colors">
            <Upload className="h-3.5 w-3.5" /> Submit a link
          </button>
        </div>
      ) : (
        !sub?.reviewedAt && !sub?.filesRemovedAt && (
          <button onClick={onScan} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-md">
            <Camera className="h-3.5 w-3.5" /> Add more pages
          </button>
        )
      )}

      {sub?.reviewedAt && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-md p-2 text-emerald-900">
          <div className="font-semibold flex items-center gap-1"><MessageSquareText className="h-3.5 w-3.5" /> Reviewed by {sub.reviewedBy}</div>
          {sub.reviewNote && <div className="mt-0.5 whitespace-pre-wrap">{sub.reviewNote}</div>}
        </div>
      )}
      {!isStudent && sub && (
        <div className="space-y-1.5">
          <textarea
            value={feedbackText ?? sub.reviewNote ?? ''}
            onChange={e => onFeedback(e.target.value)}
            rows={2}
            placeholder="Feedback for the student (optional)…"
            className="w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button onClick={onReview} disabled={busy} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md disabled:opacity-50">
            <CheckCircle2 className="h-3.5 w-3.5" /> {sub.reviewedAt ? 'Update feedback' : 'Mark reviewed'}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// v1.5: storage clean-up (tutor/admin)
// ---------------------------------------------------------------------------

function CleanupModal({ items, oldCompleted, workingId, onClose, onPdf, onDownloadAndFree, onFree, onDelete }: {
  items: { task: Task; sub: Submission }[];
  oldCompleted: Task[];
  workingId: string | null;
  onClose: () => void;
  onPdf: (t: Task) => void;
  onDownloadAndFree: (t: Task) => void;
  onFree: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const total = items.reduce((n, x) => n + (x.sub.bytes || 0), 0);
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><HardDrive className="h-5 w-5 text-slate-500" /> Submitted work &amp; space</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-sm text-slate-600">
            Submitted pages use <strong>{formatBytes(total)}</strong> of the free 1 GB database space.
            To save space, <strong>download the PDF</strong> and then <strong>free the space</strong> — the task stays marked as completed,
            with a note of who submitted it and when.
          </p>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tasks with stored pages (oldest first)</h4>
            {!items.length ? <p className="text-sm text-slate-500">Nothing stored — no space used.</p> : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {items.map(({ task, sub }) => (
                  <li key={task.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{task.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {sub.scanIds.length} page(s){sub.bytes ? ` · ${formatBytes(sub.bytes)}` : ''} · {sub.submittedBy} · {fmtDate(sub.submittedAt)}{sub.reviewedAt ? ' · reviewed' : ' · not reviewed yet'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {workingId === task.id && <Loader2 className="h-4 w-4 animate-spin text-slate-400 self-center" />}
                      <button onClick={() => onPdf(task)} className="text-xs font-semibold border border-slate-300 rounded-md px-2 py-1 hover:bg-slate-50 inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> PDF</button>
                      <button onClick={() => onDownloadAndFree(task)} className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md px-2 py-1">Download &amp; free space</button>
                      <button onClick={() => onFree(task)} className="text-xs font-semibold border border-slate-300 rounded-md px-2 py-1 hover:bg-red-50 hover:text-red-700">Free space</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Completed tasks due more than 30 days ago</h4>
            {!oldCompleted.length ? <p className="text-sm text-slate-500">None.</p> : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {oldCompleted.map((t) => (
                  <li key={t.id} className="p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 truncate">{t.title}</div>
                      <div className="text-[11px] text-slate-500">Due {t.dueDate}{t.subjectName ? ` · ${t.subjectName}` : ''}</div>
                    </div>
                    <button onClick={() => onDelete(t)} className="text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-md px-2 py-1 inline-flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> Delete task
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Deleting a task removes it (and any stored pages) completely. Make a Backup first if you may need it later.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
