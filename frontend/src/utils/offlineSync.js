import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import workerService from '../services/workerService';

const OFFLINE_VISITS_KEY = 'Sanjeevni_offline_visits';

/**
 * Get all queued offline visits
 */
export const getOfflineVisits = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_VISITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading offline visits from storage:', e);
    return [];
  }
};

/**
 * Queue a new visit while offline
 */
export const saveOfflineVisit = (visitPayload) => {
  try {
    const queue = getOfflineVisits();
    const localId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const queuedItem = {
      ...visitPayload,
      localId,
      offlineCreated: true,
      clientTimestamp: visitPayload.timestamp || new Date().toISOString(),
      queuedAt: new Date().toISOString()
    };
    queue.push(queuedItem);
    localStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('Sanjeevni:offline_queue_changed', { detail: { count: queue.length } }));
    return queuedItem;
  } catch (e) {
    console.error('Error saving offline visit:', e);
    throw e;
  }
};

/**
 * Remove an item from the offline queue
 */
export const removeOfflineVisit = (localId) => {
  try {
    const queue = getOfflineVisits().filter(item => item.localId !== localId);
    localStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('Sanjeevni:offline_queue_changed', { detail: { count: queue.length } }));
  } catch (e) {
    console.error('Error removing offline visit:', e);
  }
};

/**
 * Synchronize all queued offline visits with the server
 */
export const syncOfflineVisits = async () => {
  const queue = getOfflineVisits();
  if (!queue.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await workerService.submitVisit(item);
      removeOfflineVisit(item.localId);
      synced++;
    } catch (err) {
      console.warn(`Failed to sync offline visit ${item.localId}:`, err);
      failed++;
    }
  }

  if (synced > 0) {
    toast.success(`Synchronized ${synced} field assessment${synced > 1 ? 's' : ''} to server!`, {
      icon: '📡',
      duration: 5000
    });
  }

  return { synced, failed };
};

/**
 * Hook to track network status and offline synchronization state
 */
export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingVisits, setPendingVisits] = useState(getOfflineVisits());
  const [syncing, setSyncing] = useState(false);

  const refreshQueue = useCallback(() => {
    setPendingVisits(getOfflineVisits());
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Connection restored. Synchronizing offline data...', { icon: '🌐' });
      setSyncing(true);
      try {
        await syncOfflineVisits();
      } finally {
        setSyncing(false);
        refreshQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('You are now working in Offline Mode. Assessments will be queued locally.', {
        icon: '⚠️',
        duration: 4000
      });
    };

    const handleQueueChange = () => {
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('Sanjeevni:offline_queue_changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('Sanjeevni:offline_queue_changed', handleQueueChange);
    };
  }, [refreshQueue]);

  const syncNow = async () => {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline. Please connect to the internet.');
      return;
    }
    setSyncing(true);
    try {
      const res = await syncOfflineVisits();
      if (res.synced === 0 && res.failed > 0) {
        toast.error('Server sync encountered errors. Check connectivity.');
      }
    } finally {
      setSyncing(false);
      refreshQueue();
    }
  };

  return {
    isOnline,
    pendingCount: pendingVisits.length,
    pendingVisits,
    syncing,
    syncNow
  };
};

export default useOfflineSync;
