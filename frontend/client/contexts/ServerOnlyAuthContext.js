/**
 * AuthContext חדש - Server-Only Architecture
 * שומר רק token ב-AsyncStorage, כל השאר מהשרת
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import optimizedAPI from '../utils/optimized-api-simple';
import { useOfflineMode } from '../hooks/useOfflineMode';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { isFullyOnline, handleFailedRequest } = useOfflineMode();

  // טעינת token בלבד בהפעלה
  useEffect(() => {
    loadStoredToken();
  }, []);

  // טעינת פרטי משתמש כשיש token וחיבור
  useEffect(() => {
    if (token && isFullyOnline && !user) {
      loadUserFromServer();
    }
  }, [token, isFullyOnline, user]);

  /**
   * טעינת token בלבד מ-AsyncStorage
   */
  const loadStoredToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      
      if (storedToken) {
        setToken(storedToken);
        console.log('✅ Token loaded from storage');
      } else {
        console.log('ℹ️ No token found in storage');
        setLoading(false); // אין token - סיום טעינה
      }
    } catch (error) {
      console.error('❌ Failed to load token from storage:', error);
      setLoading(false);
    }
  };

  /**
   * טעינת פרטי משתמש מהשרת
   */
  const loadUserFromServer = async () => {
    if (!token || !isFullyOnline) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading user data from server...');
      
      // קריאה ל-API עם הtoken
      const response = await optimizedAPI.get('/api/auth/me');
      
      setUser(response.data);
      console.log('✅ User data loaded from server:', response.data.email);
      setLoading(false); // סיום טעינה מוצלח
    } catch (error) {
      console.error('❌ Failed to load user from server:', error);
      
      // אם הtoken לא תקין או המשתמש לא רמצא, רתנתק
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.log('🚪 Invalid token or user not found, logging out...');
        await logout();
      }
    }
  };
  /**
   * התחברות - שומר רק token, פרטי משתמש מהשרת
   */
  const login = async (email, password) => {
    if (!isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב.' 
      };
    }

    try {
      console.log('🔐 Attempting login...');
      
      const response = await optimizedAPI.request(
        { method: 'POST', url: '/api/auth/login', data: { email, password } },
        { useCache: false, skipQueue: true }
      );

      const { token: newToken, user: userData } = response.data;

      // שמירת token בלבד ב-AsyncStorage
      await AsyncStorage.setItem('userToken', newToken);
      
      // עדכון state
      setToken(newToken);
      setUser(userData);
      
      console.log('✅ Login successful:', userData.email);
      return { success: true };
    } catch (error) {
      console.error('❌ Login failed:', error);
      const message = error.response?.data?.error || 'שגיאת התחברות';
      return { success: false, error: message };
    }
  };

  /**
   * הרשמה - שומר רק token, פרטי משתמש מהשרת
   */
  const register = async (email, password, name = null) => {
    if (!isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב.' 
      };
    }

    try {
      console.log('📝 Attempting registration...');
      
      const response = await optimizedAPI.request(
        { method: 'POST', url: '/api/auth/register', data: { email, password, name } },
        { useCache: false, skipQueue: true }
      );

      const { token: newToken, user: userData } = response.data;

      // שמירת token בלבד ב-AsyncStorage
      await AsyncStorage.setItem('userToken', newToken);
      
      // עדכון state
      setToken(newToken);
      setUser(userData);
      
      console.log('✅ Registration successful:', userData.email);
      return { success: true };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      const message = error.response?.data?.error || 'שגיאת הרשמה';
      return { success: false, error: message };
    }
  };

  /**
   * התנתקות - מוחק רק token עם ניקוי נכון
   */
  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      const currentUserId = user?.id;
      
      // ניקוי נכון עם logout cleaner
      const { performLogoutCleanup } = await import('../utils/logout-cleaner');
      const cleanupResults = await performLogoutCleanup(currentUserId);
      
      // ניקוי state
      setToken(null);
      setUser(null);
      
      console.log('✅ Logout successful with cleanup:', cleanupResults);
      return { success: true, cleanupResults };
    } catch (error) {
      console.error('❌ Failed to logout:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * רענון פרטי משתמש מהשרת
   */
  const refreshUser = async () => {
    if (!token || !isFullyOnline) {
      return { success: false, error: 'אין חיבור לשרת' };
    }

    setRefreshing(true);
    
    try {
      console.log('🔄 Refreshing user data...');
      
      // ניקוי cache של פרופיל
      if (user?.id) {
        optimizedAPI.clearCache(`user_profile:${user.id}`);
      }
      
      const response = await optimizedAPI.getUserProfile(user?.id);
      setUser(response.data);
      
      console.log('✅ User data refreshed');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to refresh user:', error);
      
      // אם הtoken לא תקין, נתנתק
      if (error.response?.status === 401) {
        await logout();
      }
      
      return { success: false, error: error.message };
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * עדכון פרטי משתמש
   */
  const updateUser = async (userData) => {
    if (!token || !isFullyOnline) {
      return { success: false, error: 'אין חיבור לשרת' };
    }

    try {
      console.log('📝 Updating user data...');
      
      const response = await optimizedAPI.updateProfile(user?.id, userData);
      setUser(response.data);
      
      console.log('✅ User data updated');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      const message = error.response?.data?.error || 'שגיאה בעדכון פרטים';
      return { success: false, error: message };
    }
  };

  /**
   * בדיקת תקינות token
   */
  const validateToken = async () => {
    if (!token || !isFullyOnline) {
      return false;
    }

    try {
      await optimizedAPI.request(
        { method: 'GET', url: '/api/auth/me' },
        { useCache: false, skipQueue: true }
      );
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        await logout();
      }
      return false;
    }
  };

  const value = {
    // State
    user,
    token,
    loading,
    refreshing,
    isAuthenticated: !!token && !!user,
    isOnline: isFullyOnline,

    // Actions
    login,
    register,
    logout,
    refreshUser,
    updateUser,
    validateToken,

    // Helpers
    isReady: !loading && (!!token ? !!user : true), // מוכן אם לא טוען ואם יש token אז גם יש user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

// Alias לתאימות לאחור
export const useAuth = useAuthContext;

export default AuthContext;
