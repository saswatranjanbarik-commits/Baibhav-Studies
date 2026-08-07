import React, { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

export default function StoreSync({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  
  // Keep track of what the cloud told us last, so we can detect stale overwrites vs deliberate deletions
  const lastKnownCloudData = useRef<Record<string, any>>({});
  // Track if we've done our initial upload
  const initialUploadDone = useRef<boolean>(false);

  useEffect(() => {
    let originalSetItem = window.localStorage.setItem;
    let originalRemoveItem = window.localStorage.removeItem;
    let originalClear = window.localStorage.clear;
    
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
      
      // Update our reference of what the cloud state is
      lastKnownCloudData.current = JSON.parse(JSON.stringify(data));
      
      // MIGRATION: Push existing local data to cloud on first load
      if (!initialUploadDone.current) {
        let needsCloudUpload = false;
        const localUploads: Record<string, any> = {};
        
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('dugu_')) {
            const localValue = window.localStorage.getItem(key);
            if (localValue) {
              try {
                const parsedLocal = JSON.parse(localValue);
                const cloudValue = data[key];
                
                if (cloudValue === undefined) {
                  localUploads[key] = parsedLocal;
                  needsCloudUpload = true;
                  data[key] = parsedLocal; // Use it locally immediately
                } else if (Array.isArray(parsedLocal) && Array.isArray(cloudValue)) {
                  // If both are arrays, merge missing local items into cloud array
                  const isObjectArray = (parsedLocal.length > 0 && typeof parsedLocal[0] === 'object' && parsedLocal[0] !== null && 'id' in parsedLocal[0]) || 
                                        (cloudValue.length > 0 && typeof cloudValue[0] === 'object' && cloudValue[0] !== null && 'id' in cloudValue[0]);
                  
                  if (isObjectArray) {
                    const cloudMap = new Map();
                    cloudValue.forEach((item: any) => { if (item && item.id) cloudMap.set(item.id, item); });
                    
                    let merged = false;
                    parsedLocal.forEach((item: any) => {
                      if (item && item.id && !cloudMap.has(item.id)) {
                        cloudMap.set(item.id, item);
                        merged = true;
                      }
                    });
                    
                    if (merged) {
                      localUploads[key] = Array.from(cloudMap.values());
                      needsCloudUpload = true;
                      data[key] = localUploads[key];
                    }
                  } else {
                    // Primitive array merge
                    const combined = Array.from(new Set([...cloudValue, ...parsedLocal]));
                    if (combined.length > cloudValue.length) {
                      localUploads[key] = combined;
                      needsCloudUpload = true;
                      data[key] = combined;
                    }
                  }
                }
              } catch(e) {}
            }
          }
        }
        
        if (needsCloudUpload) {
          console.log("Uploading local data to cloud...", Object.keys(localUploads));
          setDoc(storeRef, localUploads, { merge: true }).catch(console.error);
        }
        initialUploadDone.current = true;
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

    let syncTimeout: any;
    let pendingUpdates: Record<string, any> = {};

    // Intercept setItem to also write to the cloud
    window.localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      
      if (!currentUser) return; // Only sync if logged in
      
      try {
        let parsedValue: any = value;
        try {
          parsedValue = JSON.parse(value);
        } catch(e) {}
        
        // Accumulate pending updates
        pendingUpdates[key] = parsedValue;
        
        // Debounce the cloud write
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          const updatesToPush = { ...pendingUpdates };
          pendingUpdates = {}; // Clear pending
          
          setDoc(storeRef, updatesToPush, { merge: true })
            .catch(e => console.error("Cloud sync error for setItem:", e));
        }, 500); // 500ms debounce for near real-time sync
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
