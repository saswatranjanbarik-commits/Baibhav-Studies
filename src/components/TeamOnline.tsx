/**
 * TeamOnline — Dashboard panel listing ONLY the people who are logged in
 * and using the app right now, with their local time and time zone.
 * Everyone else is listed underneath as "offline" with when they were last seen.
 */
import React, { useMemo, useState } from 'react';
import { Globe2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTeamUsers } from '../lib/useTeamUsers';
import { useTeamPresence, isOnline, timeAgo, PresenceRecord } from '../lib/presence';
import { formatTimeInZone, getOffsetLabel, zoneCity, isValidTimeZone } from '../lib/timezone';

export default function TeamOnline() {
  const { currentUser } = useAuth();
  const teamUsers = useTeamUsers();
  const { records, error, now } = useTeamPresence();
  const [showOffline, setShowOffline] = useState(false);

  // Combine presence with the registered user list so that people who have
  // never logged in since this feature launched still appear as offline.
  const { online, offline } = useMemo(() => {
    const byEmail = new Map<string, PresenceRecord>();
    records.forEach((r) => byEmail.set(r.email.toLowerCase(), r));
    teamUsers.forEach((u) => {
      const key = (u.email || '').toLowerCase();
      if (key && !byEmail.has(key)) {
        byEmail.set(key, { email: key, username: u.username || key, role: u.role, timeZone: '', state: 'offline', lastSeen: null });
      } else if (key) {
        // Prefer the current profile name/role from Manage Users.
        const p = byEmail.get(key)!;
        byEmail.set(key, { ...p, username: u.username || p.username, role: u.role || p.role });
      }
    });
    const all = Array.from(byEmail.values());
    const on = all.filter((p) => isOnline(p, now)).sort((a, b) => a.username.localeCompare(b.username));
    const off = all.filter((p) => !isOnline(p, now))
      .sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0));
    return { online: on, offline: off };
  }, [records, teamUsers, now]);

  const isMe = (p: PresenceRecord) => p.email.toLowerCase() === currentUser?.email?.toLowerCase();

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
      <h3 className="text-[15px] font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-blue-500" /> Team Online Now
        <span className="ml-auto text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
          {online.length} online
        </span>
      </h3>

      {error && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-2">{error}</p>}

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {online.length === 0 && !error && (
          <p className="text-sm text-slate-500">Nobody else is online right now.</p>
        )}
        {online.map((p) => {
          const tz = isValidTimeZone(p.timeZone) ? p.timeZone : 'UTC';
          return (
            <div key={p.email} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {p.username}{isMe(p) && <span className="text-slate-400 font-medium"> (you)</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatTimeInZone(tz, new Date(now))} · {zoneCity(tz)} ({getOffsetLabel(tz, new Date(now))})
                  </div>
                </div>
              </div>
              {p.role && (
                <div className="text-[10px] font-bold text-indigo-600 px-2 py-1 bg-indigo-50 rounded shrink-0">{p.role}</div>
              )}
            </div>
          );
        })}
      </div>

      {offline.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button
            onClick={() => setShowOffline(!showOffline)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            {showOffline ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Offline ({offline.length})
          </button>
          {showOffline && (
            <ul className="mt-2 space-y-1">
              {offline.map((p) => (
                <li key={p.email} className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                    {p.username}
                  </span>
                  <span>{p.lastSeen ? `last seen ${timeAgo(p.lastSeen, now)}` : 'not seen yet'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
