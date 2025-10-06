import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { checkLocalData, migrateAllData } from '../services/migration';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState({
    needed: false,
    inProgress: false,
    completed: false,
    error: null
  });

  // טעינת token בהפעלה
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // בדיקה אם יש נתונים מקומיים להעברה
        await checkMigrationNeeded();
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
    } finally {
      setLoading(false);
    }
  };

  // בדיקה אם נדרשת מיגרציה
  const checkMigrationNeeded = async () => {
    try {
      const localDataInfo = await checkLocalData();
      if (localDataInfo.hasData) {
        setMigrationStatus(prev => ({
          ...prev,
          needed: true
        }));
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
      // בדיקה אם יש נתונים מקומיים להעברה לאחר התחברות
      await checkMigrationNeeded();
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'שגיאת התחברות';
      return { success: false, error: message };
    }
  };

  const register = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/register', { email, password });
      
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'שגיאת הרשמה';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setMigrationStatus({
        needed: false,
        inProgress: false,
        completed: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // פונקציית מיגרציה
  const startMigration = async (onProgress = null) => {
    setMigrationStatus(prev => ({
      ...prev,
      inProgress: true,
      error: null
    }));

    try {
      const result = await migrateAllData(onProgress);
      
      setMigrationStatus({
        needed: false,
        inProgress: false,
        completed: true,
        error: result.success ? null : result.errors.join(', ')
      });

      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus(prev => ({
        ...prev,
        inProgress: false,
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  };

  // ביטול הצורך במיגרציה
  const skipMigration = () => {
    setMigrationStatus({
      needed: false,
      inProgress: false,
      completed: false,
      error: null
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    migrationStatus,
    startMigration,
    skipMigration,
    checkMigrationNeeded,
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
