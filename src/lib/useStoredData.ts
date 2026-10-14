/**
 * useStoredData — read a synced data set (e.g. dugu_daily_logs) and re-render
 * automatically whenever it changes (locally or from another device).
 */
import { useEffect, useState } from 'react';
import { readStore } from './storeKeys';

export function useStoredData<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(() => readStore(key, fallback));
  useEffect(() => {
    const reload = () => setValue(readStore(key, fallback));
    reload();
    window.addEventListener('cloud_sync_update', reload);
    return () => window.removeEventListener('cloud_sync_update', reload);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}
