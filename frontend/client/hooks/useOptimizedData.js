/**
 * Hook מאופטם לטעינת נתונים עם cache, prefetch, ו-background updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import optimizedAPI from '../utils/optimized-api';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Hook כללי לנתונים מאופטמים
 */
export const useOptimizedData = (fetchFunction, dependencies = [], options = {}) => {
  const {
    enableCache = true,
    enablePrefetch = true,
    enableBackgroundRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 דקות
    staleTime = 2 * 60 * 1000, // 2 דקות
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const retryCountRef = useRef(0);
  const refreshTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // בדיקה אם הנתונים stale
  const checkStale = useCallback(() => {
    if (!lastFetch) return true;
    return Date.now() - lastFetch > staleTime;
  }, [lastFetch, staleTime]);

  // טעינת נתונים
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await fetchFunction();
      
      if (isMountedRef.current) {
        setData(result.data);
        setLastFetch(Date.now());
        setIsStale(false);
        retryCountRef.current = 0;
        
        if (!isBackground) {
          setLoading(false);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Data fetch failed:', err);
      
      if (isMountedRef.current) {
        setError(err);
        
        // ניסיון חוזר
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(isBackground);
            }
          }, retryDelay * retryCountRef.current);
        } else {
          if (!isBackground) {
            setLoading(false);
          }
        }
      }
      
      throw err;
    }
  }, [fetchFunction, retryCount, retryDelay]);

  // רענון נתונים
  const refresh = useCallback(async () => {
    return await fetchData(false);
  }, [fetchData]);

  // רענון ברקע
  const backgroundRefresh = useCallback(async () => {
    if (checkStale()) {
      try {
        await fetchData(true);
      } catch (err) {
        // שגיאות ברקע לא מפריעות ל-UI
        console.warn('Background refresh failed:', err);
      }
    }
  }, [fetchData, checkStale]);

  // טעינה ראשונית
  useEffect(() => {
    fetchData();
  }, dependencies);

  // רענון תקופתי ברקע
  useEffect(() => {
    if (enableBackgroundRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(backgroundRefresh, refreshInterval);
      
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [enableBackgroundRefresh, refreshInterval, backgroundRefresh]);

  // בדיקת stale כל דקה
  useEffect(() => {
    const staleTimer = setInterval(() => {
      setIsStale(checkStale());
    }, 60 * 1000);

    return () => clearInterval(staleTimer);
  }, [checkStale]);

  // ניקוי
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    isStale,
    lastFetch,
    refresh,
    backgroundRefresh
  };
};

/**
 * Hook לפרופיל משתמש
 */
export const useUserProfile = () => {
  const { user } = useAuthContext();
  
  return useOptimizedData(
    () => optimizedAPI.getUserProfile(user?.id),
    [user?.id],
    {
      staleTime: 10 * 60 * 1000, // 10 דקות
      refreshInterval: 15 * 60 * 1000 // 15 דקות
    }
  );
};

/**
 * Hook לרכבים של משתמש
 */
export const useUserVehicles = () => {
  const { user } = useAuthContext();
  
  return useOptimizedData(
    () => optimizedAPI.getUserVehicles(user?.id),
    [user?.id],
    {
      staleTime: 5 * 60 * 1000, // 5 דקות
      refreshInterval: 10 * 60 * 1000 // 10 דקות
    }
  );
};

/**
 * Hook להזמנות של משתמש
 */
export const useUserBookings = () => {
  const { user } = useAuthContext();
  
  return useOptimizedData(
    () => optimizedAPI.getUserBookings(user?.id),
    [user?.id],
    {
      staleTime: 1 * 60 * 1000, // 1 דקה
      refreshInterval: 2 * 60 * 1000 // 2 דקות
    }
  );
};

/**
 * Hook למקומות שמורים
 */
export const useSavedPlaces = () => {
  const { user } = useAuthContext();
  
  return useOptimizedData(
    () => optimizedAPI.getSavedPlaces(user?.id),
    [user?.id],
    {
      staleTime: 10 * 60 * 1000, // 10 דקות
      refreshInterval: 30 * 60 * 1000 // 30 דקות
    }
  );
};

/**
 * Hook לחיפושים אחרונים
 */
export const useRecentSearches = () => {
  const { user } = useAuthContext();
  
  return useOptimizedData(
    () => optimizedAPI.getRecentSearches(user?.id),
    [user?.id],
    {
      staleTime: 30 * 1000, // 30 שניות
      refreshInterval: 2 * 60 * 1000 // 2 דקות
    }
  );
};

/**
 * Hook למועדפים
 */
export const useFavorites = () => {
  const { user } = useAuthContext();
  
  return useOptimizedData(
    () => optimizedAPI.getFavorites(user?.id),
    [user?.id],
    {
      staleTime: 5 * 60 * 1000, // 5 דקות
      refreshInterval: 10 * 60 * 1000 // 10 דקות
    }
  );
};

/**
 * Hook לאמצעי תשלום
 */
export const usePaymentMethods = () => {
  const { user } = useAuthContext();
  
  return useOptimizedData(
    () => optimizedAPI.getPaymentMethods(user?.id),
    [user?.id],
    {
      staleTime: 10 * 60 * 1000, // 10 דקות
      refreshInterval: 30 * 60 * 1000 // 30 דקות
    }
  );
};

/**
 * Hook לחיפוש חניות עם אופטימיזציה למיקום
 */
export const useParkingSearch = (lat, lng, radius = 5, startTime, endTime) => {
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastSearchRef = useRef(null);

  const search = useCallback(async (newLat, newLng, newRadius, newStartTime, newEndTime) => {
    const searchParams = { 
      lat: newLat || lat, 
      lng: newLng || lng, 
      radius: newRadius || radius,
      startTime: newStartTime || startTime,
      endTime: newEndTime || endTime
    };

    // מניעת חיפושים כפולים
    const searchKey = JSON.stringify(searchParams);
    if (lastSearchRef.current === searchKey) {
      return searchResults;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await optimizedAPI.searchParkings(
        searchParams.lat,
        searchParams.lng,
        searchParams.radius,
        searchParams.startTime,
        searchParams.endTime
      );

      setSearchResults(result.data);
      lastSearchRef.current = searchKey;
      return result.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius, startTime, endTime, searchResults]);

  // חיפוש אוטומטי כשהפרמטרים משתנים
  useEffect(() => {
    if (lat && lng) {
      search();
    }
  }, [lat, lng, radius, startTime, endTime]);

  return {
    searchResults,
    loading,
    error,
    search
  };
};

/**
 * Hook לטעינה מוקדמת של נתונים נפוצים
 */
export const usePrefetchCommonData = () => {
  const { user } = useAuthContext();

  const prefetchAll = useCallback(async () => {
    if (!user?.id) return;

    console.log('🚀 Prefetching common data...');

    // טעינה מקבילה של כל הנתונים הנפוצים
    const prefetchPromises = [
      optimizedAPI.getUserProfile(user.id),
      optimizedAPI.getUserVehicles(user.id),
      optimizedAPI.getSavedPlaces(user.id),
      optimizedAPI.getFavorites(user.id),
      optimizedAPI.getRecentSearches(user.id)
    ];

    try {
      await Promise.allSettled(prefetchPromises);
      console.log('✅ Prefetch completed');
    } catch (error) {
      console.warn('⚠️ Prefetch partially failed:', error);
    }
  }, [user?.id]);

  // טעינה מוקדמת כשהמשתמש מתחבר
  useEffect(() => {
    if (user?.id) {
      // המתנה קצרה לפני טעינה מוקדמת
      const timer = setTimeout(prefetchAll, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, prefetchAll]);

  // טעינה מוקדמת כשהאפליקציה חוזרת לפוקוס
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // טעינה מוקדמת ברקע
        setTimeout(prefetchAll, 500);
      }
    }, [user?.id, prefetchAll])
  );

  return { prefetchAll };
};

export default useOptimizedData;
