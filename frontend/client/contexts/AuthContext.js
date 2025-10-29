import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';
import memoryCache, { clearUserCache } from '../utils/memory-cache';
import { clearQueue } from '../utils/request-queue';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  console.log('🚀 AuthProvider STARTING UP - NEW VERSION!');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [blockingInProgress, setBlockingInProgress] = useState(false);

  // טעינת token בהפעלה
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    console.log('🔍 loadStoredAuth CALLED - checking storage...');
    try {
      const storedToken = await SecureStore.getItemAsync('userToken');
      const storedUser = await SecureStore.getItemAsync('user');
      console.log('📱 Storage check - token:', !!storedToken, 'user:', !!storedUser);
      
      if (storedToken && storedUser) {
        console.log('🔐 Loading stored auth - token exists:', !!storedToken);
        console.log('🔐 Token preview:', storedToken ? `${storedToken.substring(0, 20)}...` : 'none');
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        console.log('✅ Auth loaded successfully - isAuthenticated will be:', !!storedToken);
      } else {
        console.log('❌ No stored auth found - user will need to login');
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
    } finally {
      setLoading(false);
    }
  };


  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      
      await SecureStore.setItemAsync('userToken', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
      console.log('✅ Login successful - user:', data.user.email, 'token exists:', !!data.token);
      console.log('💾 Token saved to SecureStore successfully');
      console.log('🔐 UPDATED STATE - token in memory:', !!data.token, 'user in memory:', !!data.user);
      
      return { success: true };
    } catch (error) {
      let message = 'שגיאת התחברות';
      
      if (error.response?.status === 403) {
        // שגיאת חסימה - הודעה ברורה
        message = error.response?.data?.error || 'המשתמש חסום על ידי המנהל';
      } else if (error.response?.status === 401) {
        // שגיאת התחברות רגילה
        message = error.response?.data?.error || 'אימייל או סיסמה שגויים';
      } else {
        // שגיאות אחרות
        message = error.response?.data?.error || 'שגיאת התחברות';
      }
      
      return { success: false, error: message };
    }
  };

  const register = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/register', { email, password });
      
      await SecureStore.setItemAsync('userToken', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
      console.log('✅ Register successful - user:', data.user.email, 'token exists:', !!data.token);
      console.log('💾 Token saved to SecureStore successfully');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'שגיאת הרשמה';
      return { success: false, error: message };
    }
  };

  // פונקציה מרכזית לטיפול בחסימה
  const handleUserBlocked = async (navigation, alertFunction) => {
    console.log('🚫 handleUserBlocked called - blockingInProgress:', blockingInProgress, 'isLoggingOut:', isLoggingOut);
    
    if (blockingInProgress || isLoggingOut) {
      console.log('🚫 Already handling blocking or logging out - skipping');
      return;
    }
    
    console.log('🚫 Handling user blocked - immediate logout and redirect');
    setBlockingInProgress(true);
    
    // התנתקות מיידית
    await logout();
    
    // מעבר מיידי לHome ללא המתנה
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
    
    // הודעה פשוטה אחרי המעבר
    setTimeout(() => {
      alert('המשתמש חסום על ידי המנהל');
      setBlockingInProgress(false); // איפוס הflag
    }, 100); // דיליי קצר כדי שהמעבר יתבצע קודם
  };

  const logout = async () => {
    try {
      console.log('🔓 Starting logout process...');
      setIsLoggingOut(true);
      
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('user');
      setUser(null);
      setToken(null);
      console.log('🔓 User logged out successfully');
      const clearedCacheEntries = clearUserCache(user?.id || 'unknown');
      console.log(`💾 Cleared ${clearedCacheEntries} cache entries`);
      
      // ניקוי כל ה-cache (למקרה שיש נתונים כלליים)
      const totalCacheCleared = memoryCache.clear();
      console.log(`🧹 Cleared all ${totalCacheCleared} cache entries`);
      
      // ניקוי Request Queue
      const clearedQueueItems = clearQueue();
      console.log(`📥 Cleared ${clearedQueueItems} queued requests`);
      
      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('❌ Failed to logout:', error);
      throw error; // זורק את השגיאה כדי שהUI יוכל להתמודד איתה
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isAuthenticated = !!token;
  
  // Debug log for authentication state
  console.log('🔐 AuthContext state - token exists:', !!token, 'isAuthenticated:', isAuthenticated);

  // Helper functions לזיהוי סוג המשתמש
  const isOwner = user?.role === 'OWNER';
  const isRegularUser = user?.role === 'USER';
  const isAdmin = user?.role === 'ADMIN';

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isOwner,
    isRegularUser,
    isAdmin,
    isLoggingOut,
    blockingInProgress,
    handleUserBlocked,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
