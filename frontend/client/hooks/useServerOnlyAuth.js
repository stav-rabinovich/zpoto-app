/**
 * Hook לניהול אימות Server-Only - אין fallback מקומי כלל
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from './useOfflineMode';
import tokenManager from '../utils/token-manager';

export const useServerOnlyAuth = () => {
  const {
    user,
    token,
    loading: authLoading,
    refreshing,
    isAuthenticated,
    isOnline,
    isReady,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
    validateToken
  } = useAuthContext();

  const {
    isFullyOnline,
    isOfflineMode,
    isServerDown,
    retryConnection
  } = useOfflineMode();

  const [authState, setAuthState] = useState({
    status: 'loading', // loading, authenticated, unauthenticated, error, offline
    error: null,
    needsReauth: false
  });

  // עדכון מצב אימות
  useEffect(() => {
    updateAuthState();
  }, [isAuthenticated, isReady, isFullyOnline, user, token]);

  const updateAuthState = useCallback(() => {
    if (!isReady) {
      setAuthState({ status: 'loading', error: null, needsReauth: false });
      return;
    }

    if (!isFullyOnline) {
      if (isOfflineMode) {
        setAuthState({ 
          status: 'offline', 
          error: 'אין חיבור לאינטרנט', 
          needsReauth: false 
        });
      } else if (isServerDown) {
        setAuthState({ 
          status: 'offline', 
          error: 'השרת לא זמין כרגע', 
          needsReauth: false 
        });
      }
      return;
    }

    if (token && user) {
      setAuthState({ status: 'authenticated', error: null, needsReauth: false });
    } else if (token && !user) {
      // יש token אבל אין user - צריך לטעון מהשרת
      setAuthState({ status: 'loading', error: null, needsReauth: false });
    } else {
      setAuthState({ status: 'unauthenticated', error: null, needsReauth: false });
    }
  }, [isReady, isFullyOnline, isOfflineMode, isServerDown, token, user]);

  /**
   * התחברות עם טיפול בשגיאות
   */
  const handleLogin = useCallback(async (email, password) => {
    if (!isFullyOnline) {
      return {
        success: false,
        error: 'אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב.'
      };
    }

    try {
      setAuthState(prev => ({ ...prev, status: 'loading', error: null }));
      
      const result = await login(email, password);
      
      if (result.success) {
        setAuthState({ status: 'authenticated', error: null, needsReauth: false });
      } else {
        setAuthState({ 
          status: 'unauthenticated', 
          error: result.error, 
          needsReauth: false 
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error.message || 'שגיאה לא צפויה בהתחברות';
      setAuthState({ 
        status: 'error', 
        error: errorMessage, 
        needsReauth: false 
      });
      return { success: false, error: errorMessage };
    }
  }, [login, isFullyOnline]);

  /**
   * הרשמה עם טיפול בשגיאות
   */
  const handleRegister = useCallback(async (email, password, name) => {
    if (!isFullyOnline) {
      return {
        success: false,
        error: 'אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב.'
      };
    }

    try {
      setAuthState(prev => ({ ...prev, status: 'loading', error: null }));
      
      const result = await register(email, password, name);
      
      if (result.success) {
        setAuthState({ status: 'authenticated', error: null, needsReauth: false });
      } else {
        setAuthState({ 
          status: 'unauthenticated', 
          error: result.error, 
          needsReauth: false 
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error.message || 'שגיאה לא צפויה בהרשמה';
      setAuthState({ 
        status: 'error', 
        error: errorMessage, 
        needsReauth: false 
      });
      return { success: false, error: errorMessage };
    }
  }, [register, isFullyOnline]);

  /**
   * התנתקות עם ניקוי מלא
   */
  const handleLogout = useCallback(async () => {
    try {
      const result = await logout();
      setAuthState({ status: 'unauthenticated', error: null, needsReauth: false });
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      // גם אם ההתנתקות נכשלה, ננקה מקומית
      setAuthState({ status: 'unauthenticated', error: null, needsReauth: false });
      return { success: false, error: error.message };
    }
  }, [logout]);

  /**
   * רענון נתוני משתמש
   */
  const handleRefreshUser = useCallback(async () => {
    if (!isFullyOnline) {
      return { success: false, error: 'אין חיבור לשרת' };
    }

    try {
      const result = await refreshUser();
      
      if (!result.success && result.error?.includes('401')) {
        setAuthState({ 
          status: 'unauthenticated', 
          error: 'נדרשת התחברות מחדש', 
          needsReauth: true 
        });
      }
      
      return result;
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false, error: error.message };
    }
  }, [refreshUser, isFullyOnline]);

  /**
   * עדכון פרטי משתמש
   */
  const handleUpdateUser = useCallback(async (userData) => {
    if (!isFullyOnline) {
      return { success: false, error: 'אין חיבור לשרת' };
    }

    try {
      const result = await updateUser(userData);
      return result;
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  }, [updateUser, isFullyOnline]);

  /**
   * בדיקת תקינות אימות
   */
  const checkAuthValidity = useCallback(async () => {
    if (!isFullyOnline) {
      return false;
    }

    try {
      const isValid = await validateToken();
      
      if (!isValid) {
        setAuthState({ 
          status: 'unauthenticated', 
          error: 'נדרשת התחברות מחדש', 
          needsReauth: true 
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('Auth validation error:', error);
      setAuthState({ 
        status: 'error', 
        error: 'שגיאה בבדיקת אימות', 
        needsReauth: true 
      });
      return false;
    }
  }, [validateToken, isFullyOnline]);

  /**
   * ניסיון התחברות מחדש אוטומטי
   */
  const attemptReconnection = useCallback(async () => {
    console.log('🔄 Attempting reconnection...');
    
    try {
      // בדיקת חיבור
      const connectionResult = await retryConnection();
      
      if (connectionResult.internetOk && connectionResult.serverOk) {
        // אם יש token, נבדוק אם הוא תקין
        if (token) {
          const isValid = await checkAuthValidity();
          if (isValid && !user) {
            // Token תקין אבל אין user - נטען מהשרת
            await handleRefreshUser();
          }
        }
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: connectionResult.internetOk ? 'השרת לא זמין' : 'אין חיבור לאינטרנט' 
        };
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      return { success: false, error: error.message };
    }
  }, [retryConnection, token, user, checkAuthValidity, handleRefreshUser]);

  /**
   * קבלת מידע על מצב Token
   */
  const getTokenInfo = useCallback(() => {
    return tokenManager.getTokenInfo();
  }, []);

  return {
    // מצב אימות
    authState,
    user,
    token,
    isAuthenticated,
    isLoading: authState.status === 'loading' || authLoading,
    isRefreshing: refreshing,
    isReady,
    
    // מצב חיבור
    isOnline: isFullyOnline,
    isOffline: !isFullyOnline,
    connectionError: !isFullyOnline ? (isOfflineMode ? 'אין אינטרנט' : 'שרת לא זמין') : null,
    
    // פעולות אימות
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshUser: handleRefreshUser,
    updateUser: handleUpdateUser,
    
    // פעולות עזר
    checkAuthValidity,
    attemptReconnection,
    getTokenInfo,
    
    // בדיקות מצב
    needsLogin: authState.status === 'unauthenticated' || authState.needsReauth,
    hasError: authState.status === 'error',
    isOfflineError: authState.status === 'offline',
    
    // הודעות
    errorMessage: authState.error,
    statusMessage: getStatusMessage(authState, isFullyOnline)
  };
};

/**
 * קבלת הודעת סטטוס
 */
function getStatusMessage(authState, isOnline) {
  switch (authState.status) {
    case 'loading':
      return 'טוען...';
    case 'authenticated':
      return 'מחובר';
    case 'unauthenticated':
      return authState.needsReauth ? 'נדרשת התחברות מחדש' : 'לא מחובר';
    case 'error':
      return authState.error || 'שגיאה';
    case 'offline':
      return isOnline ? 'השרת לא זמין' : 'אין חיבור לאינטרנט';
    default:
      return 'מצב לא ידוע';
  }
}

export default useServerOnlyAuth;
