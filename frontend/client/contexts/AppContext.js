/**
 * AppContext - מנהל state גלובלי של האפליקציה
 * מטרה: לרכז states חוזרים ולמנוע prop drilling
 */

import React, { createContext, useState, useContext, useCallback } from 'react';

const AppContext = createContext({});

export const AppProvider = ({ children }) => {
  // State גלובלי לטעינות
  const [globalLoading, setGlobalLoading] = useState(false);
  const [screenLoadingStates, setScreenLoadingStates] = useState({});
  
  // State לרענון
  const [refreshingStates, setRefreshingStates] = useState({});
  
  // State לנתונים משותפים
  const [currentUser, setCurrentUser] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  
  // State למועדפים (משותף בין מסכים)
  const [favorites, setFavorites] = useState({
    ids: [],
    dataMap: {}
  });
  
  // State להתראות
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // פונקציות עזר לניהול loading states
  const setScreenLoading = useCallback((screenName, isLoading) => {
    setScreenLoadingStates(prev => ({
      ...prev,
      [screenName]: isLoading
    }));
  }, []);

  const getScreenLoading = useCallback((screenName) => {
    return screenLoadingStates[screenName] || false;
  }, [screenLoadingStates]);

  // פונקציות עזר לניהול refreshing states
  const setScreenRefreshing = useCallback((screenName, isRefreshing) => {
    setRefreshingStates(prev => ({
      ...prev,
      [screenName]: isRefreshing
    }));
  }, []);

  const getScreenRefreshing = useCallback((screenName) => {
    return refreshingStates[screenName] || false;
  }, [refreshingStates]);

  // פונקציות לניהול מועדפים
  const updateFavorites = useCallback((newFavorites) => {
    setFavorites(newFavorites);
  }, []);

  const addToFavorites = useCallback((id, data) => {
    setFavorites(prev => ({
      ids: [...prev.ids, id],
      dataMap: { ...prev.dataMap, [id]: data }
    }));
  }, []);

  const removeFromFavorites = useCallback((id) => {
    setFavorites(prev => ({
      ids: prev.ids.filter(fId => fId !== id),
      dataMap: { ...prev.dataMap, [id]: undefined }
    }));
  }, []);

  // פונקציות לניהול התראות
  const updateNotifications = useCallback((newNotifications) => {
    setNotifications(newNotifications);
  }, []);

  const updateUnreadCount = useCallback((count) => {
    setUnreadCount(count);
  }, []);

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // פונקציות לניהול הזמנה פעילה
  const setActiveBookingData = useCallback((booking) => {
    setActiveBooking(booking);
  }, []);

  const clearActiveBooking = useCallback(() => {
    setActiveBooking(null);
  }, []);

  // פונקציות לניהול חניה נבחרת
  const setSelectedParkingData = useCallback((parking) => {
    setSelectedParking(parking);
  }, []);

  const clearSelectedParking = useCallback(() => {
    setSelectedParking(null);
  }, []);

  // פונקציה לניקוי כל ה-state (בעת logout)
  const clearAllAppState = useCallback(() => {
    setCurrentUser(null);
    setActiveBooking(null);
    setSelectedParking(null);
    setFavorites({ ids: [], dataMap: {} });
    setNotifications([]);
    setUnreadCount(0);
    setScreenLoadingStates({});
    setRefreshingStates({});
    setGlobalLoading(false);
  }, []);

  const value = {
    // Global states
    globalLoading,
    setGlobalLoading,
    currentUser,
    setCurrentUser,
    activeBooking,
    selectedParking,
    favorites,
    notifications,
    unreadCount,

    // Screen-specific loading/refreshing
    setScreenLoading,
    getScreenLoading,
    setScreenRefreshing,
    getScreenRefreshing,

    // Favorites management
    updateFavorites,
    addToFavorites,
    removeFromFavorites,

    // Notifications management
    updateNotifications,
    updateUnreadCount,
    markNotificationAsRead,

    // Active booking management
    setActiveBookingData,
    clearActiveBooking,

    // Selected parking management
    setSelectedParkingData,
    clearSelectedParking,

    // Cleanup
    clearAllAppState
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook לשימוש ב-AppContext
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
