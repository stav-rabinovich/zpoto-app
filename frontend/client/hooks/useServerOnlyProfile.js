/**
 * Hook לניהול פרופיל משתמש Server-Only - אין שמירה מקומית כלל
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from './useOfflineMode';
import { profileAPI } from '../utils/server-only-api-simple';
import optimizedAPI from '../utils/optimized-api-simple';

export const useServerOnlyProfile = () => {
  const { user, isAuthenticated, updateUser } = useAuthContext();
  const { isFullyOnline, handleFailedRequest } = useOfflineMode();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // טעינת פרופיל מהשרת
  useEffect(() => {
    if (isAuthenticated && isFullyOnline) {
      loadProfile();
    }
  }, [isAuthenticated, isFullyOnline]);

  // סנכרון עם user מ-AuthContext
  useEffect(() => {
    if (user && !profile) {
      setProfile(user);
    }
  }, [user, profile]);

  /**
   * טעינת פרופיל מהשרת בלבד
   */
  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !isFullyOnline) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('👤 Loading profile from server...');
      
      const [profileResponse, statsResponse] = await Promise.all([
        optimizedAPI.getUserProfile(user?.id),
        optimizedAPI.getUserStats(user?.id).catch(() => ({ data: null })) // סטטיסטיקות אופציונליות
      ]);
      
      setProfile(profileResponse.data);
      setStats(statsResponse.data);
      
      console.log('✅ Profile loaded from server');
    } catch (error) {
      console.error('❌ Failed to load profile:', error);
      setError(error.message || 'שגיאה בטעינת פרופיל');
      
      // אין fallback מקומי - רק הודעת שגיאה
      if (!isFullyOnline) {
        setError('אין חיבור לשרת. בדוק את החיבור ונסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * רענון פרופיל
   */
  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated || !isFullyOnline) {
      return { success: false, error: 'אין חיבור לשרת' };
    }

    setRefreshing(true);
    setError(null);

    try {
      console.log('🔄 Refreshing profile from server...');
      
      // ניקוי cache
      if (user?.id) {
        optimizedAPI.clearCache(`user_profile:${user.id}`);
        optimizedAPI.clearCache(`user_stats:${user.id}`);
      }
      
      const [profileResponse, statsResponse] = await Promise.all([
        optimizedAPI.getUserProfile(user?.id, { forceRefresh: true }),
        optimizedAPI.getUserStats(user?.id, { forceRefresh: true }).catch(() => ({ data: null }))
      ]);
      
      setProfile(profileResponse.data);
      setStats(statsResponse.data);
      
      console.log('✅ Profile refreshed');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to refresh profile:', error);
      const errorMessage = error.message || 'שגיאה ברענון פרופיל';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * עדכון פרופיל - רק בשרת
   */
  const updateProfile = useCallback(async (profileData) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. עדכון פרופיל דורש חיבור לאינטרנט.' 
      };
    }

    // ולידציה בסיסית
    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      return { success: false, error: 'כתובת אימייל לא תקינה' };
    }

    if (profileData.name && profileData.name.trim().length < 2) {
      return { success: false, error: 'השם חייב להכיל לפחות 2 תווים' };
    }

    setUpdating(true);

    try {
      console.log('📝 Updating profile on server...', profileData);
      
      const response = await profileAPI.update(profileData);
      const updatedProfile = response.data;
      
      // עדכון state מקומי
      setProfile(updatedProfile);
      
      // עדכון AuthContext
      await updateUser(updatedProfile);
      
      // ניקוי cache רלוונטי
      if (user?.id) {
        optimizedAPI.clearCache(`user_profile:${user.id}`);
      }
      
      console.log('✅ Profile updated successfully');
      return { success: true, data: updatedProfile };
      
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בעדכון פרופיל';
      
      // אין שמירה מקומית - רק החזרת שגיאה
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  }, [isAuthenticated, isFullyOnline, user?.id, updateUser]);

  /**
   * עדכון סיסמה - רק בשרת
   */
  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. עדכון סיסמה דורש חיבור לאינטרנט.' 
      };
    }

    // ולידציה בסיסית
    if (!currentPassword || !newPassword) {
      return { success: false, error: 'נא למלא את כל השדות' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים' };
    }

    try {
      console.log('🔐 Updating password on server...');
      
      const response = await profileAPI.updatePassword(currentPassword, newPassword);
      
      console.log('✅ Password updated successfully');
      return { success: true, message: response.data?.message || 'הסיסמה עודכנה בהצלחה' };
      
    } catch (error) {
      console.error('❌ Failed to update password:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בעדכון סיסמה';
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline]);

  /**
   * מחיקת חשבון - רק בשרת
   */
  const deleteAccount = useCallback(async () => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. מחיקת חשבון דורשת חיבור לאינטרנט.' 
      };
    }

    try {
      console.log('🗑️ Deleting account on server...');
      
      const response = await profileAPI.delete();
      
      console.log('✅ Account deleted successfully');
      return { success: true, message: response.data?.message || 'החשבון נמחק בהצלחה' };
      
    } catch (error) {
      console.error('❌ Failed to delete account:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה במחיקת חשבון';
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline]);

  /**
   * קבלת סטטיסטיקות משתמש
   */
  const getProfileStats = useCallback(() => {
    return stats || {
      totalBookings: 0,
      activeBookings: 0,
      totalSpent: 0,
      favoriteSpots: 0,
      savedPlaces: 0,
      vehicles: 0,
      memberSince: profile?.createdAt || null
    };
  }, [stats, profile]);

  /**
   * בדיקה אם הפרופיל שלם
   */
  const isProfileComplete = useCallback(() => {
    if (!profile) return false;
    
    return !!(
      profile.name?.trim() &&
      profile.email?.trim() &&
      profile.phone?.trim()
    );
  }, [profile]);

  /**
   * קבלת שדות חסרים בפרופיל
   */
  const getMissingFields = useCallback(() => {
    if (!profile) return [];
    
    const missing = [];
    
    if (!profile.name?.trim()) missing.push('שם מלא');
    if (!profile.email?.trim()) missing.push('כתובת אימייל');
    if (!profile.phone?.trim()) missing.push('מספר טלפון');
    
    return missing;
  }, [profile]);

  /**
   * פורמט תאריך הצטרפות
   */
  const getMemberSinceFormatted = useCallback(() => {
    if (!profile?.createdAt) return null;
    
    const date = new Date(profile.createdAt);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [profile]);

  return {
    // נתונים
    profile,
    stats,
    loading,
    refreshing,
    updating,
    error,
    
    // פעולות
    loadProfile,
    refreshProfile,
    updateProfile,
    updatePassword,
    deleteAccount,
    
    // עזרים
    getProfileStats,
    isProfileComplete,
    getMissingFields,
    getMemberSinceFormatted,
    
    // מצב
    isEmpty: !profile,
    isOnline: isFullyOnline,
    canManageProfile: isAuthenticated && isFullyOnline,
    
    // הודעות
    statusMessage: !isAuthenticated ? 'נדרשת התחברות' :
                  !isFullyOnline ? 'אין חיבור לשרת' :
                  loading ? 'טוען פרופיל...' :
                  error ? error :
                  !profile ? 'אין נתוני פרופיל' :
                  'פרופיל טעון'
  };
};

export default useServerOnlyProfile;
