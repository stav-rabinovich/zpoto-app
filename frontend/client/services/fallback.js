/**
 * שירות Fallback - בוטל
 * המערכת עובדת כעת 100% מול השרת
 */

// כל הפונקציות מחזירות הודעה שה-fallback בוטל

export const addPendingAction = async (action) => {
  return { success: true, message: 'Fallback בוטל - אין שמירה מקומית' };
};

export const getPendingActions = async () => {
  console.log('📝 Fallback disabled - no pending actions');
  return [];
};

export const removePendingAction = async (actionId) => {
  console.log('📝 Fallback disabled - no pending actions to remove');
  return { success: true };
};

export const syncPendingActions = async () => {
  console.log('📝 Fallback disabled - no sync needed');
  return { success: true, syncedCount: 0 };
};

export const cacheData = async (key, data, ttl = 3600000) => {
  console.log('📝 Fallback disabled - no caching');
  return { success: true, message: 'Cache בוטל' };
};

export const getCachedItem = async (key) => {
  console.log('📝 Fallback disabled - no cached data');
  return null;
};

export const getCachedData = async () => {
  console.log('📝 Fallback disabled - no cached data');
  return {};
};

export const removeCachedItem = async (key) => {
  console.log('📝 Fallback disabled - no cache to remove');
  return { success: true };
};

export const cleanExpiredCache = async () => {
  console.log('📝 Fallback disabled - no cache to clean');
  return { success: true, cleanedCount: 0 };
};

export const updateLastSync = async () => {
  console.log('📝 Fallback disabled - no sync tracking');
  return { success: true, timestamp: new Date().toISOString() };
};

export const getLastSync = async () => {
  console.log('📝 Fallback disabled - no sync data');
  return null;
};

export const setOfflineMode = async (isOffline) => {
  console.log('📝 Fallback disabled - no offline mode');
  return { success: true };
};

export const isOfflineMode = async () => {
  console.log('📝 Fallback disabled - always online mode');
  return false;
};

export const isOnline = async () => {
  console.log('📝 Fallback disabled - assuming online');
  return true;
};

export const clearAllFallbackData = async () => {
  console.log('📝 Fallback disabled - no data to clear');
  return { success: true, message: 'אין נתוני fallback למחיקה' };
};

export const getFallbackStats = async () => {
  console.log('📝 Fallback disabled - no stats');
  return {
    totalItems: 0,
    pendingActions: 0,
    cachedItems: 0,
    lastSync: null,
    isOffline: false,
    message: 'Fallback בוטל'
  };
};
