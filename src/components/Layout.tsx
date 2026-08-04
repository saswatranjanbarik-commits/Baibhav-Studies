import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Layout() {
  const { logout, currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-[#1F4E79] text-white flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-indigo-300" />
          <h1 className="text-xl font-extrabold tracking-tight font-sans">Dugu EduTrack</h1>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold ml-2">v1.0</span>
          <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-semibold ml-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            online
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="font-bold text-sm leading-tight">{currentUser?.email?.split('@')[0] || 'User'}</div>
            <div className="text-xs text-indigo-200">IST +5:30 &middot; {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
            {(currentUser?.email?.[0] || 'U').toUpperCase()}
          </div>
          <button 
            onClick={() => logout()}
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
