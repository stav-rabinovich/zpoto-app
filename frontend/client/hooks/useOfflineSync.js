import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-netinfo/netinfo';
import { 
  isOnline, 
  savePendingAction, 
  executePendingActions, 
  cacheData, 
  getCachedItem,
  setOfflineMode,
  isOfflineMode,
  getFallbackStats,
  setupAutoSync
} from '../services/fallback';
import api from '../utils/api';

/**
 * Hook לניהול מצב offline וסינכרון אוטומטי
 */
export const useOfflineSync = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [fallbackStats, setFallbackStats] = useState(null);

  // בדיקת מצב החיבור
  const checkConnectionStatus = useCallback(async () => {
    const online = await isOnline();
    const offline = await isOfflineMode();
    
    setIsConnected(online);
    setIsOffline(offline);
    
    return { online, offline };
  }, []);

  // סינכרון פעולות ממתינות
  const syncPendingActions = useCallback(async () => {
    if (!isConnected || syncInProgress) return;

    setSyncInProgress(true);
    try {
      const result = await executePendingActions(async (endpoint, options) => {
        return await api({
          url: endpoint,
          method: options.method,
          data: options.data
        });
      });

      console.log('Sync completed:', result);
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      setSyncInProgress(false);
    }
  }, [isConnected, syncInProgress]);

  // עדכון סטטיסטיקות
  const updateStats = useCallback(async () => {
    const stats = await getFallbackStats();
    if (stats.success) {
      setFallbackStats(stats.data);
    }
  }, []);

  // הגדרת מצב offline ידני
  const toggleOfflineMode = useCallback(async (forceOffline = null) => {
    const newOfflineState = forceOffline !== null ? forceOffline : !isOffline;
    await setOfflineMode(newOfflineState);
    setIsOffline(newOfflineState);
    
    if (!newOfflineState && isConnected) {
      // יצא ממצב offline - בצע סינכרון
      await syncPendingActions();
    }
    
    await updateStats();
  }, [isOffline, isConnected, syncPendingActions, updateStats]);

  // שמירת פעולה לביצוע מאוחר יותר
  const saveForLater = useCallback(async (endpoint, method, data) => {
    const result = await savePendingAction({
      type: 'api_call',
      endpoint,
      method,
      data
    });
    
    if (result.success) {
      await updateStats();
    }
    
    return result;
  }, [updateStats]);

  // שמירה במטמון עם TTL
  const cacheWithTTL = useCallback(async (key, data, ttlMinutes = 60) => {
    const ttl = ttlMinutes * 60 * 1000; // המרה למילישניות
    return await cacheData(key, data, ttl);
  }, []);

  // קבלה מהמטמון
  const getFromCache = useCallback(async (key) => {
    return await getCachedItem(key);
  }, []);

  // API call עם fallback אוטומטי
  const apiCallWithFallback = useCallback(async (endpoint, options = {}) => {
    const { method = 'GET', data = null, cacheKey = null, cacheTTL = 60 } = options;

    // אם במצב offline או אין חיבור
    if (isOffline || !isConnected) {
      // אם זה GET request, נסה לקבל מהמטמון
      if (method === 'GET' && cacheKey) {
        const cachedData = await getFromCache(cacheKey);
        if (cachedData) {
          return { success: true, data: cachedData, fromCache: true };
        }
      }

      // אם זה לא GET או אין במטמון, שמור לביצוע מאוחר יותר
      if (method !== 'GET') {
        const saveResult = await saveForLater(endpoint, method, data);
        if (saveResult.success) {
          return { 
            success: true, 
            data: null, 
            pending: true, 
            message: 'הפעולה נשמרה לביצוע כשיחזור החיבור' 
          };
        }
      }

      return { 
        success: false, 
        error: 'אין חיבור לאינטרנט והנתונים לא זמינים במטמון',
        offline: true 
      };
    }

    // יש חיבור - בצע קריאה רגילה
    try {
      const response = await api({
        url: endpoint,
        method,
        data
      });

      // שמור במטמון אם זה GET request
      if (method === 'GET' && cacheKey && response.data) {
        await cacheWithTTL(cacheKey, response.data, cacheTTL);
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error('API call failed:', error);
      
      // אם זה GET request, נסה לקבל מהמטמון כ-fallback
      if (method === 'GET' && cacheKey) {
        const cachedData = await getFromCache(cacheKey);
        if (cachedData) {
          return { 
            success: true, 
            data: cachedData, 
            fromCache: true,
            warning: 'נתונים מהמטמון - ייתכן שלא עדכניים'
          };
        }
      }

      return { success: false, error: error.message };
    }
  }, [isOffline, isConnected, getFromCache, saveForLater, cacheWithTTL]);

  // אתחול
  useEffect(() => {
    checkConnectionStatus();
    updateStats();

    // הגדרת מאזין לשינויי חיבור
    const unsubscribe = setupAutoSync(async () => {
      await checkConnectionStatus();
      await syncPendingActions();
      await updateStats();
    });

    // מאזין נוסף לשינויי מצב הרשת
    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
    });

    return () => {
      unsubscribe();
      netInfoUnsubscribe();
    };
  }, [checkConnectionStatus, syncPendingActions, updateStats]);

  return {
    // מצב
    isConnected,
    isOffline,
    syncInProgress,
    fallbackStats,
    
    // פונקציות
    checkConnectionStatus,
    syncPendingActions,
    toggleOfflineMode,
    saveForLater,
    cacheWithTTL,
    getFromCache,
    apiCallWithFallback,
    updateStats
  };
};
