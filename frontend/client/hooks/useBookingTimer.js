/**
 * useBookingTimer - Hook לניהול טיימרים של הזמנות
 * מטרה: לרכז לוגיקת טיימרים שחוזרת במספר מסכים
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export const useBookingTimer = (bookings = []) => {
  const [timers, setTimers] = useState({});
  const intervalRef = useRef(null);
  
  // חישוב זמן שנותר להזמנה
  const calculateTimeLeft = useCallback((booking) => {
    if (!booking || !booking.endTime) return 0;
    
    const now = new Date();
    const endTime = new Date(booking.endTime);
    const timeLeft = endTime.getTime() - now.getTime();
    
    return Math.max(0, timeLeft);
  }, []);
  
  // עדכון טיימרים
  const updateTimers = useCallback(() => {
    const newTimers = {};
    
    bookings.forEach(booking => {
      if (booking && booking.id) {
        newTimers[booking.id] = calculateTimeLeft(booking);
      }
    });
    
    setTimers(newTimers);
  }, [bookings, calculateTimeLeft]);
  
  // התחלת טיימרים
  const startTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    updateTimers();
    intervalRef.current = setInterval(updateTimers, 1000);
  }, [updateTimers]);
  
  // עצירת טיימרים
  const stopTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // פורמט זמן לתצוגה
  const formatTimeLeft = useCallback((timeLeftMs) => {
    if (!timeLeftMs || timeLeftMs <= 0) return 'הסתיים';
    
    const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } else {
      return `${minutes} דקות`;
    }
  }, []);
  
  // בדיקה אם הזמנה פעילה
  const isBookingActive = useCallback((booking) => {
    if (!booking) return false;
    
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    
    return now >= startTime && now <= endTime;
  }, []);
  
  // בדיקה אם הזמנה עתידית
  const isBookingUpcoming = useCallback((booking) => {
    if (!booking) return false;
    
    const now = new Date();
    const startTime = new Date(booking.startTime);
    
    return now < startTime;
  }, []);
  
  // ניקוי בעת unmount
  useEffect(() => {
    return () => {
      stopTimers();
    };
  }, [stopTimers]);
  
  // עדכון טיימרים כשהזמנות משתנות
  useEffect(() => {
    if (bookings.length > 0) {
      startTimers();
    } else {
      stopTimers();
    }
  }, [bookings, startTimers, stopTimers]);
  
  return {
    timers,
    formatTimeLeft,
    isBookingActive,
    isBookingUpcoming,
    startTimers,
    stopTimers,
    calculateTimeLeft
  };
};
