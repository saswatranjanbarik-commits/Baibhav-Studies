/**
 * useTeamUsers — loads all user profiles from the Firestore `users`
 * collection ONCE per page visit.
 *
 * (The Dashboard used to re-download this list after every single save,
 * and the Daily Log looked for teachers in a localStorage key that nothing
 * ever wrote, so its Teacher dropdown was always empty.)
 */
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { AppUser } from './AuthContext';

export function useTeamUsers(): AppUser[] {
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, 'users'))
      .then((snap) => {
        if (cancelled) return;
        setUsers(snap.docs.map((d) => ({ email: d.id, ...d.data() }) as AppUser));
      })
      .catch((e) => console.error('Could not load team members:', e));
    return () => { cancelled = true; };
  }, []);

  return users;
}
