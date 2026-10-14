import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { SyncBadge, SyncBanner } from './SyncStatusBar';

export default function Layout() {
  const { logout, currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keep the header clock current (it used to freeze at page load).
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

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
          <h1 className="text-xl font-extrabold tracking-tight font-sans">Dugu EduTrack</h1>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold ml-1 sm:ml-2">v1.1</span>
          <SyncBadge />
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <div className="font-bold text-sm leading-tight">{currentUser?.username || 'User'}</div>
            <div className="text-xs text-indigo-200">{currentUser?.timezone?.split(' ')[0] || 'Time'} &middot; {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
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

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
