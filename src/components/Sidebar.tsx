import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart2, 
  PenTool, 
  Book, 
  Paperclip, 
  RefreshCw, 
  MessageSquare, 
  Target,
  CheckSquare,
  Calendar,
  Clock,
  Users,
  ClipboardList
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart2, color: 'text-indigo-600' },
  { name: 'Daily Log', href: '/daily-log', icon: ClipboardList, color: 'text-indigo-500' },
  { name: 'Study Plan', href: '/plan', icon: PenTool, color: 'text-gray-600' },
  { name: 'Syllabus', href: '/syllabus', icon: Book, color: 'text-green-600' },
  { name: 'Study Notes', href: '/notes', icon: Paperclip, color: 'text-gray-400' },
  { name: 'Revisions', href: '/revisions', icon: RefreshCw, color: 'text-blue-500' },
  { name: 'Team Notes', href: '/team-notes', icon: MessageSquare, color: 'text-gray-400' },
  { name: 'Flashcards & Quiz', href: '/flashcards', icon: Target, color: 'text-red-500' },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, color: 'text-green-500' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, color: 'text-red-400' },
  { name: 'Timetable', href: '/timetable', icon: Clock, color: 'text-red-400' },
  { name: 'Manage Users', href: '/users', icon: Users, color: 'text-blue-600' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="hidden md:flex md:w-56 md:flex-col bg-white border-r border-slate-200 h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="flex-1 flex flex-col overflow-y-auto py-2">
        <div className="px-4 py-2 mb-2 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Teacher Portal</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2 text-[13px] font-medium rounded-md border-l-4 ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-600' 
                    : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-4 w-4 ${isActive ? 'text-indigo-600' : item.color}`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-200 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
        Live Sync &middot; Baibhav &middot; Std 5A
      </div>
    </div>
  );
}
