/**
 * useParkingAvailability - Hook לבדיקת זמינות חניות
 * מטרה: לרכז לוגיקת בדיקת זמינות שחוזרת במספר מסכים
 */

import { useState, useCallback } from 'react';
import api from '../utils/api';

export const useParkingAvailability = () => {
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState({});
  
  // בדיקת זמינות חניה ספציפית
  const checkParkingAvailability = useCallback(async (parkingId, startDate, endDate) => {
    try {
      setCheckingAvailability(true);
      
      const response = await api.get(`/api/bookings/availability/${parkingId}`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      
      const result = {
        available: response.data.available,
        reason: response.data.reason,
        conflictingBookings: response.data.conflictingBookings || [],
        ownerUnavailable: response.data.ownerUnavailable || false
      };
      
      // שמירה בcache
      const cacheKey = `${parkingId}-${startDate.toISOString()}-${endDate.toISOString()}`;
      setAvailabilityResults(prev => ({
        ...prev,
        [cacheKey]: result
      }));
      
      return result;
    } catch (error) {
      console.error('Error checking parking availability:', error);
      return {
        available: false,
        reason: 'שגיאה בבדיקת זמינות',
        conflictingBookings: [],
        ownerUnavailable: false
      };
    } finally {
      setCheckingAvailability(false);
    }
  }, []);
  
  // בדיקת זמינות מרובה (batch)
  const checkMultipleParkingsAvailability = useCallback(async (parkings, startDate, endDate) => {
    try {
      setCheckingAvailability(true);
      
      const results = await Promise.all(
        parkings.map(async (parking) => {
          const availability = await checkParkingAvailability(parking.id, startDate, endDate);
          return {
            parkingId: parking.id,
            parking,
            ...availability
          };
        })
      );
      
      return results;
    } catch (error) {
      console.error('Error checking multiple parkings availability:', error);
      return parkings.map(parking => ({
        parkingId: parking.id,
        parking,
        available: false,
        reason: 'שגיאה בבדיקת זמינות',
        conflictingBookings: [],
        ownerUnavailable: false
      }));
    } finally {
      setCheckingAvailability(false);
    }
  }, [checkParkingAvailability]);
  
  // בדיקה אם חניה זמינה בזמן נתון (לפי הגדרות בעל החניה)
  const isAvailableByOwnerSettings = useCallback((parking, dateTime) => {
    if (!parking || !parking.availability || !dateTime) return false;
    
    const date = new Date(dateTime);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const timeString = date.toTimeString().slice(0, 5); // HH:MM
    
    // מציאת הגדרות היום
    const daySettings = parking.availability.find(avail => avail.dayOfWeek === dayOfWeek);
    if (!daySettings || !daySettings.isActive) return false;
    
    // בדיקת טווח שעות
    if (daySettings.startTime && daySettings.endTime) {
      return timeString >= daySettings.startTime && timeString <= daySettings.endTime;
    }
    
    return true;
  }, []);
  
  // סינון חניות זמינות
  const filterAvailableParkings = useCallback((parkings, startDate, endDate) => {
    return parkings.filter(parking => {
      // בדיקה בסיסית לפי הגדרות בעל החניה
      const startAvailable = isAvailableByOwnerSettings(parking, startDate);
      const endAvailable = isAvailableByOwnerSettings(parking, endDate);
      
      return startAvailable && endAvailable;
    });
  }, [isAvailableByOwnerSettings]);
  
  // קבלת תוצאה מה-cache
  const getCachedAvailability = useCallback((parkingId, startDate, endDate) => {
    const cacheKey = `${parkingId}-${startDate.toISOString()}-${endDate.toISOString()}`;
    return availabilityResults[cacheKey];
  }, [availabilityResults]);
  
  // ניקוי cache
  const clearAvailabilityCache = useCallback(() => {
    setAvailabilityResults({});
  }, []);
  
  return {
    checkingAvailability,
    checkParkingAvailability,
    checkMultipleParkingsAvailability,
    isAvailableByOwnerSettings,
    filterAvailableParkings,
    getCachedAvailability,
    clearAvailabilityCache
  };
};
