/**
 * useScreenState - Hook לניהול state של מסך ספציפי
 * מטרה: לרכז loading, refreshing ו-error states
 */

import { useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';

export const useScreenState = (screenName) => {
  const { setScreenLoading, getScreenLoading, setScreenRefreshing, getScreenRefreshing } = useApp();
  
  // Local error state (לא משותף בין מסכים)
  const [error, setError] = useState(null);
  
  // Loading state מ-AppContext
  const loading = getScreenLoading(screenName);
  const refreshing = getScreenRefreshing(screenName);
  
  // פונקציות עזר
  const setLoading = useCallback((isLoading) => {
    setScreenLoading(screenName, isLoading);
  }, [screenName, setScreenLoading]);
  
  const setRefreshing = useCallback((isRefreshing) => {
    setScreenRefreshing(screenName, isRefreshing);
  }, [screenName, setScreenRefreshing]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setLoading(false);
    setRefreshing(false);
  }, [setLoading, setRefreshing]);
  
  // פונקציה לביצוע פעולה עם loading
  const executeWithLoading = useCallback(async (asyncFunction) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      return result;
    } catch (err) {
      handleError(err.message || 'שגיאה לא צפויה');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, handleError]);
  
  // פונקציה לביצוע פעולה עם refreshing
  const executeWithRefreshing = useCallback(async (asyncFunction) => {
    try {
      setRefreshing(true);
      setError(null);
      const result = await asyncFunction();
      return result;
    } catch (err) {
      handleError(err.message || 'שגיאה לא צפויה');
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, [setRefreshing, handleError]);
  
  return {
    loading,
    refreshing,
    error,
    setLoading,
    setRefreshing,
    clearError,
    handleError,
    executeWithLoading,
    executeWithRefreshing
  };
};
