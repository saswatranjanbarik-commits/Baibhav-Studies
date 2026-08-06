import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

export default function StoreSync({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    let originalSetItem = window.localStorage.setItem;
    let originalRemoveItem = window.localStorage.removeItem;
    let originalClear = window.localStorage.clear;
    
    // We use a generic 'app_data' document or one per user if available
    const storeDocId = currentUser ? `user_${currentUser.id}` : 'global_store';
    const storeRef = doc(db, 'appStore', storeDocId);

    const fetchStore = async () => {
      try {
        const docSnap = await getDoc(storeRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Populate local storage with cloud data
          for (const [key, value] of Object.entries(data)) {
            originalSetItem.call(window.localStorage, key, JSON.stringify(value));
          }
        }
      } catch (error) {
        console.error('Error fetching store from cloud:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStore();

    // Intercept setItem to also write to the cloud
    window.localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      try {
        let parsedValue = value;
        try {
          parsedValue = JSON.parse(value);
        } catch(e) {}
        
        setDoc(storeRef, { [key]: parsedValue }, { merge: true })
          .catch(e => console.error("Cloud sync error for setItem:", e));
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      window.localStorage.setItem = originalSetItem;
      window.localStorage.removeItem = originalRemoveItem;
      window.localStorage.clear = originalClear;
    };
  }, [currentUser]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Loading your workspace...</div>;
  }

  return <>{children}</>;
}
