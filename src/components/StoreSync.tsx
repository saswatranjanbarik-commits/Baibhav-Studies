import React, { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

export default function StoreSync({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  
  // Keep track of what the cloud told us last, so we can detect stale overwrites vs deliberate deletions
  const lastKnownCloudData = useRef<Record<string, any>>({});

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
        let parsedValue: any = value;
        try {
          parsedValue = JSON.parse(value);
        } catch(e) {}
        
        // Use a transaction to safely merge arrays and objects
        runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(storeRef);
          const currentData = docSnap.exists() ? docSnap.data() : {};
          const existingValue = currentData[key];
          
          let mergedValue: any = parsedValue;
          
          if (existingValue !== undefined) {
            if (Array.isArray(existingValue) && Array.isArray(parsedValue)) {
              const isObjectArray = (parsedValue.length > 0 && typeof parsedValue[0] === 'object' && parsedValue[0] !== null && 'id' in parsedValue[0]) ||
                                    (existingValue.length > 0 && typeof existingValue[0] === 'object' && existingValue[0] !== null && 'id' in existingValue[0]);
              
              if (isObjectArray) {
                const existingCloudArray = existingValue;
                const lastKnownArray = lastKnownCloudData.current[key] || [];
                const userNewArray = parsedValue;

                const lastKnownMap = new Map();
                lastKnownArray.forEach((item: any) => { if (item && item.id) lastKnownMap.set(item.id, item); });

                const userNewMap = new Map();
                userNewArray.forEach((item: any) => { if (item && item.id) userNewMap.set(item.id, item); });

                const mergedMap = new Map();

                existingCloudArray.forEach((item: any) => {
                  if (item && item.id) {
                    if (userNewMap.has(item.id)) {
                      mergedMap.set(item.id, userNewMap.get(item.id));
                    } else {
                      if (lastKnownMap.has(item.id)) {
                        // User knew about it and deleted it. (Do not add to mergedMap)
                      } else {
                        // User never knew about it (added by another client). Preserve it!
                        mergedMap.set(item.id, item);
                      }
                    }
                  }
                });

                userNewArray.forEach((item: any) => {
                  if (item && item.id && !mergedMap.has(item.id)) {
                    mergedMap.set(item.id, item);
                  }
                });

                mergedValue = Array.from(mergedMap.values());
              } else {
                mergedValue = Array.from(new Set([...existingValue, ...parsedValue]));
              }
            } else if (typeof existingValue === 'object' && existingValue !== null && typeof parsedValue === 'object' && parsedValue !== null) {
              mergedValue = { ...existingValue, ...parsedValue };
            }
          }
          
          transaction.set(storeRef, { [key]: mergedValue }, { merge: true });
        }).catch(e => console.error("Cloud sync transaction error for setItem:", e));
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
