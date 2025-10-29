import { useState, useEffect, useCallback, useRef } from 'react';
import { checkParkingAvailability, validateBookingSlot } from '../services/api/bookings';

/**
 * Hook לניהול זמינות חניות
 * מספק פונקציות לבדיקת זמינות, validation, וניהול cache
 */
export const useAvailability = () => {
  const [availabilityCache, setAvailabilityCache] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cache timeout - 2 דקות
  const CACHE_TIMEOUT = 2 * 60 * 1000;
  const cacheTimeouts = useRef(new Map());

  /**
   * ניקוי cache entry אחרי timeout
   */
  const clearCacheEntry = useCallback((key) => {
    setAvailabilityCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
    
    if (cacheTimeouts.current.has(key)) {
      clearTimeout(cacheTimeouts.current.get(key));
      cacheTimeouts.current.delete(key);
    }
  }, []);

  /**
   * יצירת מפתח cache
   */
  const createCacheKey = useCallback((parkingId, startTime) => {
    return `${parkingId}-${startTime}`;
  }, []);

  /**
   * בדיקת זמינות חניה עם cache
   * @param {number} parkingId - מזהה החניה
   * @param {string} startTime - זמן התחלה (ISO string)
   * @param {boolean} forceRefresh - האם לכפות רענון (לא להשתמש בcache)
   * @returns {Promise} נתוני זמינות
   */
  const checkAvailability = useCallback(async (parkingId, startTime, forceRefresh = false) => {
    const cacheKey = createCacheKey(parkingId, startTime);
    
    // בדוק אם יש בcache ולא מכפים רענון
    if (!forceRefresh && availabilityCache.has(cacheKey)) {
      console.log(`📦 Using cached availability for ${cacheKey}`);
      return availabilityCache.get(cacheKey);
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Fetching fresh availability for parking ${parkingId}`);
      
      const result = await checkParkingAvailability(parkingId, startTime);
      
      if (result.success) {
        // שמור בcache
        setAvailabilityCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, result);
          return newCache;
        });

        // הגדר timeout לניקוי cache
        const timeoutId = setTimeout(() => {
          clearCacheEntry(cacheKey);
        }, CACHE_TIMEOUT);
        
        cacheTimeouts.current.set(cacheKey, timeoutId);
        
        console.log(`✅ Cached availability for ${cacheKey}`);
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('❌ Error in checkAvailability:', err);
      const errorResult = {
        success: false,
        error: 'שגיאה בבדיקת זמינות',
        data: null
      };
      setError(errorResult.error);
      return errorResult;
    } finally {
      setLoading(false);
    }
  }, [availabilityCache, createCacheKey, clearCacheEntry]);

  /**
   * בדיקת תקינות הזמנה
   * @param {number} parkingId - מזהה החניה
   * @param {string} startTime - זמן התחלה (ISO string)
   * @param {string} endTime - זמן סיום (ISO string)
   * @returns {Promise} תוצאת validation
   */
  const validateBooking = useCallback(async (parkingId, startTime, endTime) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Validating booking for parking ${parkingId}`);
      
      const result = await validateBookingSlot(parkingId, startTime, endTime);
      
      if (!result.success) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('❌ Error in validateBooking:', err);
      const errorResult = {
        success: false,
        valid: false,
        error: 'שגיאה בבדיקת תקינות ההזמנה'
      };
      setError(errorResult.error);
      return errorResult;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ניקוי cache ידני
   */
  const clearCache = useCallback(() => {
    console.log('🧹 Clearing availability cache');
    
    // נקה את כל הtimeouts
    cacheTimeouts.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    cacheTimeouts.current.clear();
    
    // נקה את הcache
    setAvailabilityCache(new Map());
    setError(null);
  }, []);

  /**
   * ניקוי cache לחניה ספציפית
   */
  const clearParkingCache = useCallback((parkingId) => {
    console.log(`🧹 Clearing cache for parking ${parkingId}`);
    
    setAvailabilityCache(prev => {
      const newCache = new Map(prev);
      
      // מצא ומחק את כל הentries של החניה הזו
      for (const [key] of newCache) {
        if (key.startsWith(`${parkingId}-`)) {
          newCache.delete(key);
          
          // נקה timeout אם קיים
          if (cacheTimeouts.current.has(key)) {
            clearTimeout(cacheTimeouts.current.get(key));
            cacheTimeouts.current.delete(key);
          }
        }
      }
      
      return newCache;
    });
  }, []);

  /**
   * ניקוי כשהcomponent נמחק
   */
  useEffect(() => {
    return () => {
      // נקה את כל הtimeouts כשהcomponent נמחק
      cacheTimeouts.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      cacheTimeouts.current.clear();
    };
  }, []);

  return {
    // Functions
    checkAvailability,
    validateBooking,
    clearCache,
    clearParkingCache,
    
    // State
    loading,
    error,
    cacheSize: availabilityCache.size,
    
    // Utils
    createCacheKey
  };
};

export default useAvailability;
