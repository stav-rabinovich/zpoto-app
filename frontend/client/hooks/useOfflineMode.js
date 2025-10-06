import { useState, useCallback } from 'react';

/**
 * Hook פשוט לניהול מצב offline - גרסה בסיסית ללא dependencies
 */
export const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [serverAvailable, setServerAvailable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  // בדיקת חיבור פשוטה
  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  // עדכון מצב החיבור
  const retryConnection = useCallback(async () => {
    setIsChecking(true);
    const connected = await checkConnection();
    setIsOnline(connected);
    setServerAvailable(connected);
    setIsChecking(false);
    return connected;
  }, [checkConnection]);

  // נתונים נגזרים
  const isFullyOnline = isOnline && serverAvailable;
  const isOfflineMode = !isOnline;
  const isServerDown = isOnline && !serverAvailable;

  // פונקציה לטיפול בבקשות כושלות
  const handleFailedRequest = useCallback((error) => {
    console.warn('Request failed:', error);
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
      setIsOnline(false);
    }
    if (error.response?.status >= 500) {
      setServerAvailable(false);
    }
  }, []);

  return {
    // מצב חיבור
    isOnline,
    serverAvailable,
    isFullyOnline,
    isOfflineMode,
    isServerDown,
    isChecking,
    
    // פעולות
    retryConnection,
    checkConnection,
    handleFailedRequest,
    
    // עזרים
    statusMessage: !isOnline ? 'אין חיבור לאינטרנט' :
                  !serverAvailable ? 'השרת לא זמין' :
                  'מחובר'
  };
};

export default useOfflineMode;
