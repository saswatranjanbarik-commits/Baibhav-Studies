import React, { useEffect, useState } from 'react';

export default function StoreSync({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let originalSetItem = window.localStorage.setItem;
    let originalRemoveItem = window.localStorage.removeItem;
    let originalClear = window.localStorage.clear;

    const fetchStore = async () => {
      try {
        const response = await fetch('/api/store');
        const data = await response.json();
        
        // Populate local storage with cloud data
        for (const [key, value] of Object.entries(data)) {
          originalSetItem.call(window.localStorage, key, JSON.stringify(value));
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
        fetch(`/api/store/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: value
        }).catch(e => console.error("Cloud sync error for setItem:", e));
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      window.localStorage.setItem = originalSetItem;
      window.localStorage.removeItem = originalRemoveItem;
      window.localStorage.clear = originalClear;
    };
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Loading your workspace...</div>;
  }

  return <>{children}</>;
}
