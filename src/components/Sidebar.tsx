import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
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
  ClipboardList,
  Star,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart2, color: 'text-indigo-600', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Appreciation', href: '/appreciation', icon: Star, color: 'text-yellow-500', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Daily Log', href: '/daily-log', icon: ClipboardList, color: 'text-indigo-500', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Study Plan', href: '/plan', icon: PenTool, color: 'text-gray-600', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Syllabus', href: '/syllabus', icon: Book, color: 'text-green-600', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Study Notes', href: '/notes', icon: Paperclip, color: 'text-gray-400', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Revisions', href: '/revisions', icon: RefreshCw, color: 'text-blue-500', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Team Notes', href: '/team-notes', icon: MessageSquare, color: 'text-gray-400', roles: ['Admin', 'Teacher'] },
  { name: 'Flashcards & Quiz', href: '/flashcards', icon: Target, color: 'text-red-500', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, color: 'text-green-500', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Calendar', href: '/calendar', icon: Calendar, color: 'text-red-400', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Timetable', href: '/timetable', icon: Clock, color: 'text-red-400', roles: ['Admin', 'Teacher', 'Student'] },
  { name: 'Manage Users', href: '/users', icon: Users, color: 'text-blue-600', roles: ['Admin'] },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'Student';

  const filteredNav = navigation.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity md:hidden ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Sidebar container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col md:translate-x-0 md:static md:w-56 md:h-[calc(100vh-3.5rem)]
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 py-3 md:hidden border-b border-slate-100">
          <span className="font-bold text-slate-800">Menu</span>
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto py-2">
          <div className="px-4 py-2 mb-2 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              {userRole === 'Admin' ? 'Admin Portal' : userRole === 'Teacher' ? 'Teacher Portal' : 'Student Portal'}
            </p>
          </div>
          <nav className="flex-1 space-y-0.5 px-2">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
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
          Live Sync &middot; {currentUser?.username || 'User'} &middot; Std 5A
        </div>
      </div>
    </>
  );
}
