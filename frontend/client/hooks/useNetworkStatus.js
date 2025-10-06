import { useState, useEffect, useCallback } from 'react';
import { getConnectionStatus } from '../utils/network';

/**
 * Hook לניהול מצב החיבור לשרת
 * @param {number} checkInterval - מרווח בדיקה במילישניות (ברירת מחדל: 30 שניות)
 * @returns {Object} מצב החיבור ופונקציות ניהול
 */
export const useNetworkStatus = (checkInterval = 30000) => {
  const [connectionStatus, setConnectionStatus] = useState({
    hasInternet: null,
    serverAvailable: null,
    isChecking: false,
    lastCheck: null,
    error: null
  });

  const checkConnection = useCallback(async () => {
    setConnectionStatus(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const status = await getConnectionStatus();
      
      setConnectionStatus(prevStatus => {
        // בדיקה אם השרת חזר לפעילות
        const wasServerDown = prevStatus.hasInternet === true && prevStatus.serverAvailable === false;
        const isServerBackUp = status.hasInternet && status.serverAvailable;
        
        if (wasServerDown && isServerBackUp) {
          console.log('🎉 Server is back online!');
        }
        
        return {
          hasInternet: status.hasInternet,
          serverAvailable: status.serverAvailable,
          isChecking: false,
          lastCheck: new Date(),
          error: null
        };
      });
      
      return status;
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setConnectionStatus(prev => ({
        ...prev,
        isChecking: false,
        error: error.message
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    // בדיקה ראשונית
    checkConnection();
    
    // בדיקה תקופתית
    const interval = setInterval(checkConnection, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkConnection, checkInterval]);

  const isOnline = connectionStatus.hasInternet && connectionStatus.serverAvailable;
  const isOffline = connectionStatus.hasInternet === false;
  const serverDown = connectionStatus.hasInternet === true && connectionStatus.serverAvailable === false;

  return {
    ...connectionStatus,
    isOnline,
    isOffline,
    serverDown,
    checkConnection,
    // פונקציות עזר
    getStatusText: () => {
      if (connectionStatus.isChecking) return 'בודק חיבור...';
      if (isOnline) return 'מחובר לשרת';
      if (serverDown) return 'שרת לא זמין';
      if (isOffline) return 'אין חיבור';
      return 'מצב לא ידוע';
    },
    getStatusColor: () => {
      if (connectionStatus.isChecking) return '#007AFF';
      if (isOnline) return '#34C759';
      if (serverDown) return '#FF9500';
      if (isOffline) return '#FF3B30';
      return '#8E8E93';
    },
    getStatusIcon: () => {
      if (connectionStatus.isChecking) return 'refresh-outline';
      if (isOnline) return 'checkmark-circle';
      if (serverDown) return 'warning';
      if (isOffline) return 'close-circle';
      return 'help-circle';
    }
  };
};

export default useNetworkStatus;
