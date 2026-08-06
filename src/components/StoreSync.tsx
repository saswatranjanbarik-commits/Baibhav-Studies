import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

export default function StoreSync({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    let originalSetItem = window.localStorage.setItem;
    let originalRemoveItem = window.localStorage.removeItem;
    let originalClear = window.localStorage.clear;
    
    // Use a single shared global store so all users see the pre-existing data
    const storeDocId = 'global_store';
    const storeRef = doc(db, 'appStore', storeDocId);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Listen to real-time changes from the cloud
    const unsubscribe = onSnapshot(storeRef, async (docSnap) => {
      let data = docSnap.exists() ? docSnap.data() : {};
      
      // MIGRATION: Push existing local data to cloud if it's not in the cloud yet
      let needsCloudUpload = false;
      const localUploads: Record<string, any> = {};
      
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('dugu_')) {
          // If the cloud doesn't have this key, we should upload our local version
          if (data[key] === undefined) {
            const localValue = window.localStorage.getItem(key);
            if (localValue) {
              try {
                localUploads[key] = JSON.parse(localValue);
                needsCloudUpload = true;
                data[key] = localUploads[key]; // immediately use it locally
              } catch (e) {}
            }
          }
        }
      }

      if (needsCloudUpload) {
        console.log("Uploading existing local data to cloud...", localUploads);
        setDoc(storeRef, localUploads, { merge: true }).catch(console.error);
      }

      // Populate local storage with cloud data
      let changed = false;
      for (const [key, value] of Object.entries(data)) {
        const stringified = JSON.stringify(value);
        if (window.localStorage.getItem(key) !== stringified) {
          originalSetItem.call(window.localStorage, key, stringified);
          changed = true;
        }
      }
      
      // Dispatch an event so components know data was updated remotely
      if (changed) {
        window.dispatchEvent(new Event('cloud_sync_update'));
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Error in store sync snapshot:', error);
      setLoading(false);
    });

    // Intercept setItem to also write to the cloud
    window.localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      
      if (!currentUser) return; // Only sync if logged in
      
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
      unsubscribe();
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
