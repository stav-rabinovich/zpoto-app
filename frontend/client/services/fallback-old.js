import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';

/**
 * שירות Fallback לאחסון מקומי כאשר אין חיבור לאינטרנט
 */

// מפתחות לאחסון מקומי
const FALLBACK_KEYS = {
  PENDING_ACTIONS: 'fallback_pending_actions',
  CACHED_DATA: 'fallback_cached_data',
  LAST_SYNC: 'fallback_last_sync',
  OFFLINE_MODE: 'fallback_offline_mode'
};

/**
 * בדיקת מצב החיבור לאינטרנט
 * @returns {Promise<boolean>} האם יש חיבור
 */
export const isOnline = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  } catch (error) {
    console.error('Failed to check network status:', error);
    return false; // במקרה של שגיאה, נניח שאין חיבור
  }
};

/**
 * שמירת פעולה לביצוע מאוחר יותר כשיחזור החיבור
 * @param {Object} action - הפעולה לשמירה
 * @param {string} action.type - סוג הפעולה
 * @param {string} action.endpoint - נקודת הקצה
 * @param {Object} action.data - הנתונים
 * @param {string} action.method - שיטת HTTP
 * @returns {Promise} תוצאת השמירה
 */
export const savePendingAction = async (action) => {
  try {
    const pendingActions = await getPendingActions();
    const newAction = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...action
    };
    
    pendingActions.push(newAction);
    await AsyncStorage.setItem(FALLBACK_KEYS.PENDING_ACTIONS, JSON.stringify(pendingActions));
    
    return { success: true, actionId: newAction.id };
  } catch (error) {
    console.error('Failed to save pending action:', error);
    return { success: false, error: error.message };
  }
};

/**
 * קבלת רשימת פעולות ממתינות
 * @returns {Promise<Array>} רשימת פעולות
 */
export const getPendingActions = async () => {
  try {
    const data = await AsyncStorage.getItem(FALLBACK_KEYS.PENDING_ACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get pending actions:', error);
    return [];
  }
};

/**
 * מחיקת פעולה ממתינה
 * @param {string} actionId - מזהה הפעולה
 * @returns {Promise} תוצאת המחיקה
 */
export const removePendingAction = async (actionId) => {
  try {
    const pendingActions = await getPendingActions();
    const filteredActions = pendingActions.filter(action => action.id !== actionId);
    await AsyncStorage.setItem(FALLBACK_KEYS.PENDING_ACTIONS, JSON.stringify(filteredActions));
    return { success: true };
  } catch (error) {
    console.error('Failed to remove pending action:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ביצוע כל הפעולות הממתינות
 * @param {Function} apiCall - פונקציה לביצוע קריאות API
 * @returns {Promise} תוצאת הביצוע
 */
export const executePendingActions = async (apiCall) => {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  try {
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await apiCall(action.endpoint, {
          method: action.method,
          data: action.data
        });
        
        await removePendingAction(action.id);
        results.success++;
      } catch (error) {
        console.error(`Failed to execute action ${action.id}:`, error);
        results.failed++;
        results.errors.push({
          actionId: action.id,
          error: error.message
        });
      }
    }

    // עדכון זמן הסינכרון האחרון
    await updateLastSync();
    
    return { success: true, results };
  } catch (error) {
    console.error('Failed to execute pending actions:', error);
    return { success: false, error: error.message, results };
  }
};

/**
 * שמירת נתונים במטמון מקומי
 * @param {string} key - מפתח הנתונים
 * @param {Object} data - הנתונים לשמירה
 * @param {number} ttl - זמן תוקף במילישניות (אופציונלי)
 * @returns {Promise} תוצאת השמירה
 */
export const cacheData = async (key, data, ttl = null) => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl : null
    };
    
    const cachedData = await getCachedData();
    cachedData[key] = cacheItem;
    
    await AsyncStorage.setItem(FALLBACK_KEYS.CACHED_DATA, JSON.stringify(cachedData));
    return { success: true };
  } catch (error) {
    console.error('Failed to cache data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * קבלת נתונים מהמטמון
 * @param {string} key - מפתח הנתונים
 * @returns {Promise} הנתונים או null
 */
export const getCachedItem = async (key) => {
  try {
    const cachedData = await getCachedData();
    const item = cachedData[key];
    
    if (!item) return null;
    
    // בדיקת תוקף
    if (item.ttl && Date.now() > item.ttl) {
      await removeCachedItem(key);
      return null;
    }
    
    return item.data;
  } catch (error) {
    console.error('Failed to get cached item:', error);
    return null;
  }
};

/**
 * קבלת כל הנתונים המטמונים
 * @returns {Promise<Object>} כל הנתונים המטמונים
 */
export const getCachedData = async () => {
  try {
    const data = await AsyncStorage.getItem(FALLBACK_KEYS.CACHED_DATA);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to get cached data:', error);
    return {};
  }
};

/**
 * מחיקת פריט מהמטמון
 * @param {string} key - מפתח הפריט
 * @returns {Promise} תוצאת המחיקה
 */
export const removeCachedItem = async (key) => {
  try {
    const cachedData = await getCachedData();
    delete cachedData[key];
    await AsyncStorage.setItem(FALLBACK_KEYS.CACHED_DATA, JSON.stringify(cachedData));
    return { success: true };
  } catch (error) {
    console.error('Failed to remove cached item:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ניקוי מטמון פגי תוקף
 * @returns {Promise} תוצאת הניקוי
 */
export const cleanExpiredCache = async () => {
  try {
    const cachedData = await getCachedData();
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of Object.entries(cachedData)) {
      if (item.ttl && now > item.ttl) {
        delete cachedData[key];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      await AsyncStorage.setItem(FALLBACK_KEYS.CACHED_DATA, JSON.stringify(cachedData));
    }
    
    return { success: true, cleanedCount };
  } catch (error) {
    console.error('Failed to clean expired cache:', error);
    return { success: false, error: error.message };
  }
};

/**
 * עדכון זמן הסינכרון האחרון
 * @returns {Promise} תוצאת העדכון
 */
export const updateLastSync = async () => {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(FALLBACK_KEYS.LAST_SYNC, timestamp);
    return { success: true, timestamp };
  } catch (error) {
    console.error('Failed to update last sync:', error);
    return { success: false, error: error.message };
  }
};

/**
 * קבלת זמן הסינכרון האחרון
 * @returns {Promise<string|null>} זמן הסינכרון האחרון
 */
export const getLastSync = async () => {
  try {
    return await AsyncStorage.getItem(FALLBACK_KEYS.LAST_SYNC);
  } catch (error) {
    console.error('Failed to get last sync:', error);
    return null;
  }
};

/**
 * הגדרת מצב offline
 * @param {boolean} isOffline - האם במצב offline
 * @returns {Promise} תוצאת ההגדרה
 */
export const setOfflineMode = async (isOffline) => {
  try {
    await AsyncStorage.setItem(FALLBACK_KEYS.OFFLINE_MODE, JSON.stringify(isOffline));
    return { success: true };
  } catch (error) {
    console.error('Failed to set offline mode:', error);
    return { success: false, error: error.message };
  }
};

/**
 * בדיקת מצב offline
 * @returns {Promise<boolean>} האם במצב offline
 */
export const isOfflineMode = async () => {
  try {
    const data = await AsyncStorage.getItem(FALLBACK_KEYS.OFFLINE_MODE);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Failed to check offline mode:', error);
    return false;
  }
};

/**
 * סינכרון אוטומטי כשחוזר החיבור
 * @param {Function} syncCallback - פונקציה לביצוע הסינכרון
 * @returns {Function} פונקציה לביטול המאזין
 */
export const setupAutoSync = (syncCallback) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      // החיבור חזר - בצע סינכרון
      syncCallback();
    }
  });

  return unsubscribe;
};

/**
 * מחיקת כל נתוני ה-fallback
 * @returns {Promise} תוצאת המחיקה
 */
export const clearAllFallbackData = async () => {
  try {
    const keys = Object.values(FALLBACK_KEYS);
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
    return { success: true, message: 'כל נתוני ה-fallback נמחקו' };
  } catch (error) {
    console.error('Failed to clear fallback data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * קבלת סטטיסטיקות fallback
 * @returns {Promise} סטטיסטיקות
 */
export const getFallbackStats = async () => {
  try {
    const [pendingActions, cachedData, lastSync, isOffline] = await Promise.all([
      getPendingActions(),
      getCachedData(),
      getLastSync(),
      isOfflineMode()
    ]);

    const stats = {
      pendingActionsCount: pendingActions.length,
      cachedItemsCount: Object.keys(cachedData).length,
      lastSync: lastSync ? new Date(lastSync).toLocaleString('he-IL') : 'אף פעם',
      isOfflineMode: isOffline,
      oldestPendingAction: pendingActions.length > 0 ? 
        new Date(Math.min(...pendingActions.map(a => new Date(a.timestamp)))).toLocaleString('he-IL') : 
        null
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Failed to get fallback stats:', error);
    return { success: false, error: error.message };
  }
};
