import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { SyncBadge, SyncBanner } from './SyncStatusBar';
import HeaderClock from './HeaderClock';
import ReminderScheduler from './ReminderScheduler';
import { usePresenceHeartbeat } from '../lib/presence';

export default function Layout() {
  const { logout, currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tell the rest of the team we're online while the app is open.
  usePresenceHeartbeat(currentUser);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-[#1F4E79] text-white flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden p-1.5 -ml-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <BookOpen className="h-6 w-6 text-indigo-300 hidden sm:block" />
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight font-sans whitespace-nowrap">Dugu EduTrack</h1>
          <span className="hidden sm:inline text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2">v1.2</span>
          <SyncBadge />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User's local time and time zone */}
          <HeaderClock />
          <div className="text-right hidden lg:block border-l border-white/20 pl-3">
            <div className="font-bold text-sm leading-tight">{currentUser?.username || 'User'}</div>
            <div className="text-[11px] text-indigo-200">{currentUser?.role}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 hidden sm:flex items-center justify-center font-bold text-sm" title={currentUser?.username}>
            {(currentUser?.username?.[0] || 'U').toUpperCase()}
          </div>
          <button 
             onClick={() => logout()}
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Save-failure / storage warnings (renders nothing when all is well) */}
      <SyncBanner />

      {/* Fires study reminders while the app is open (renders a banner when due) */}
      <ReminderScheduler />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
