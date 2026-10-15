/**
 * NextClassCard — Dashboard banner for the next online class (shows only if
 * one is coming up), with a live countdown and the Join button.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitorPlay } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { STORE_KEYS } from '../lib/storeKeys';
import { useStoredData } from '../lib/useStoredData';
import { OnlineClass, upcomingClasses } from '../lib/classes';
import ClassCard from './ClassCard';

export default function NextClassCard() {
  const { currentUser } = useAuth();
  const classes = useStoredData<OnlineClass[]>(STORE_KEYS.classes, []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  const next = upcomingClasses(classes, now)[0];
  if (!next) return null;
  const isHost = currentUser?.role === 'Teacher' || currentUser?.role === 'Admin';

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
          <MonitorPlay className="h-4 w-4 text-indigo-600" /> Next online class
        </h3>
        <Link to="/classes" className="text-xs font-semibold text-indigo-600 hover:underline">All classes</Link>
      </div>
      <ClassCard cls={next} now={now} isHost={isHost} compact />
    </div>
  );
}
