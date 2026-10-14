/**
 * HeaderClock — shows the signed-in user's local time, date and time zone
 * in the top bar, e.g. "21:48 · Wed 14 Oct · Europe/London (GMT+1)".
 *
 * The zone is detected from the device, so it is always correct for wherever
 * the user is right now (including summer-time changes).
 */
import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getDeviceTimeZone, getOffsetLabel, formatTimeInZone, formatDateInZone, zoneCity } from '../lib/timezone';

export default function HeaderClock() {
  const [now, setNow] = useState(new Date());
  const tz = getDeviceTimeZone();

  useEffect(() => {
    // Tick on the minute boundary so the clock never lags.
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => { clearTimeout(timeout); if (interval) clearInterval(interval); };
  }, []);

  const offset = getOffsetLabel(tz, now);

  return (
    <div className="text-right leading-tight" title={`Your time zone: ${tz} ${offset}`}>
      <div className="flex items-center justify-end gap-1.5 font-bold text-sm">
        <Clock className="h-3.5 w-3.5 text-indigo-200" />
        <span>{formatTimeInZone(tz, now)}</span>
        <span className="hidden md:inline font-medium text-indigo-200">· {formatDateInZone(tz, now)}</span>
      </div>
      <div className="text-[11px] text-indigo-200">
        <span className="hidden sm:inline">{tz}</span>
        <span className="sm:hidden">{zoneCity(tz)}</span>
        {offset && <span> ({offset})</span>}
      </div>
    </div>
  );
}
