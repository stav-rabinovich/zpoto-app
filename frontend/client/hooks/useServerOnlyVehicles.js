/**
 * Hook לניהול רכבים Server-Only - אין שמירה מקומית כלל
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from './useOfflineMode';
import { vehiclesAPI } from '../utils/server-only-api';
import optimizedAPI from '../utils/optimized-api';
import {
  getDefaultVehicle,
  formatLicensePlate,
  validateLicensePlate,
  getVehicleDisplayName,
  getColorDisplayName,
  sortVehicles,
  hasDefaultVehicle
} from '../services/api/vehicles';

export const useServerOnlyVehicles = () => {
  const { user, isAuthenticated } = useAuthContext();
  const { isFullyOnline, handleFailedRequest } = useOfflineMode();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // טעינת רכבים מהשרת
  useEffect(() => {
    if (isAuthenticated && isFullyOnline) {
      loadVehicles();
    }
  }, [isAuthenticated, isFullyOnline]);

  /**
   * טעינת רכבים מהשרת בלבד
   */
  const loadVehicles = useCallback(async () => {
    if (!isAuthenticated || !isFullyOnline) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚗 Loading vehicles from server...');
      
      const response = await optimizedAPI.getUserVehicles(user?.id);
      const vehiclesList = sortVehicles(response.data || []);
      setVehicles(vehiclesList);
      
      console.log(`✅ Loaded ${vehiclesList.length} vehicles from server`);
    } catch (error) {
      console.error('❌ Failed to load vehicles:', error);
      setError(error.message || 'שגיאה בטעינת רכבים');
      
      // אין fallback מקומי - רק הודעת שגיאה
      if (!isFullyOnline) {
        setError('אין חיבור לשרת. בדוק את החיבור ונסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * רענון רכבים
   */
  const refreshVehicles = useCallback(async () => {
    if (!isAuthenticated || !isFullyOnline) {
      return { success: false, error: 'אין חיבור לשרת' };
    }

    setRefreshing(true);
    setError(null);

    try {
      console.log('🔄 Refreshing vehicles from server...');
      
      // ניקוי cache
      if (user?.id) {
        optimizedAPI.clearCache(`user_vehicles:${user.id}`);
      }
      
      const response = await optimizedAPI.getUserVehicles(user?.id, { forceRefresh: true });
      const vehiclesList = sortVehicles(response.data || []);
      setVehicles(vehiclesList);
      
      console.log(`✅ Refreshed ${vehiclesList.length} vehicles`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to refresh vehicles:', error);
      const errorMessage = error.message || 'שגיאה ברענון רכבים';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * יצירת רכב חדש - רק בשרת
   */
  const createVehicle = useCallback(async (vehicleData) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. יצירת רכב דורשת חיבור לאינטרנט.' 
      };
    }

    // ולידציה מקומית
    if (!vehicleData.licensePlate?.trim()) {
      return { success: false, error: 'מספר רכב הוא שדה חובה' };
    }

    if (!validateLicensePlate(vehicleData.licensePlate)) {
      return { success: false, error: 'מספר רכב לא תקין' };
    }

    try {
      console.log('🚗 Creating vehicle on server...', vehicleData);
      
      // פורמט מספר הרכב
      const formattedData = {
        ...vehicleData,
        licensePlate: formatLicensePlate(vehicleData.licensePlate),
        // אם זה הרכב הראשון, הגדר אותו כברירת מחדל
        isDefault: vehicleData.isDefault || vehicles.length === 0
      };
      
      const response = await vehiclesAPI.create(formattedData);
      const newVehicle = response.data;
      
      // עדכון רשימת הרכבים
      const updatedVehicles = sortVehicles([...vehicles, newVehicle]);
      setVehicles(updatedVehicles);
      
      // ניקוי cache רלוונטי
      if (user?.id) {
        optimizedAPI.clearCache(`user_vehicles:${user.id}`);
        optimizedAPI.clearCache(`user_profile:${user.id}`);
      }
      
      console.log('✅ Vehicle created successfully:', newVehicle.id);
      return { success: true, data: newVehicle };
      
    } catch (error) {
      console.error('❌ Failed to create vehicle:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה ביצירת הרכב';
      
      // אין שמירה מקומית - רק החזרת שגיאה
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline, user?.id, vehicles]);

  /**
   * עדכון רכב - רק בשרת
   */
  const updateVehicle = useCallback(async (vehicleId, vehicleData) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. עדכון רכב דורש חיבור לאינטרנט.' 
      };
    }

    // ולידציה מקומית
    if (vehicleData.licensePlate && !validateLicensePlate(vehicleData.licensePlate)) {
      return { success: false, error: 'מספר רכב לא תקין' };
    }

    try {
      console.log('📝 Updating vehicle on server:', vehicleId, vehicleData);
      
      // פורמט מספר הרכב אם נשלח
      const formattedData = {
        ...vehicleData,
        ...(vehicleData.licensePlate && {
          licensePlate: formatLicensePlate(vehicleData.licensePlate)
        })
      };
      
      const response = await vehiclesAPI.update(vehicleId, formattedData);
      const updatedVehicle = response.data;
      
      // עדכון רשימת הרכבים
      const updatedVehicles = vehicles.map(vehicle => 
        vehicle.id === vehicleId ? updatedVehicle : vehicle
      );
      setVehicles(sortVehicles(updatedVehicles));
      
      // ניקוי cache רלוונטי
      if (user?.id) {
        optimizedAPI.clearCache(`user_vehicles:${user.id}`);
        optimizedAPI.clearCache(`vehicle:${vehicleId}`);
      }
      
      console.log('✅ Vehicle updated successfully');
      return { success: true, data: updatedVehicle };
      
    } catch (error) {
      console.error('❌ Failed to update vehicle:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בעדכון הרכב';
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline, user?.id, vehicles]);

  /**
   * מחיקת רכב - רק בשרת
   */
  const deleteVehicle = useCallback(async (vehicleId) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. מחיקת רכב דורשת חיבור לאינטרנט.' 
      };
    }

    try {
      console.log('🗑️ Deleting vehicle on server:', vehicleId);
      
      const response = await vehiclesAPI.delete(vehicleId);
      
      // עדכון רשימת הרכבים
      const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== vehicleId);
      setVehicles(updatedVehicles);
      
      // אם מחקנו את רכב ברירת המחדל ויש רכבים נוספים, הגדר את הראשון כברירת מחדל
      if (updatedVehicles.length > 0 && !hasDefaultVehicle(updatedVehicles)) {
        await setDefaultVehicle(updatedVehicles[0].id);
      }
      
      // ניקוי cache רלוונטי
      if (user?.id) {
        optimizedAPI.clearCache(`user_vehicles:${user.id}`);
        optimizedAPI.clearCache(`vehicle:${vehicleId}`);
      }
      
      console.log('✅ Vehicle deleted successfully');
      return { success: true, message: response.message };
      
    } catch (error) {
      console.error('❌ Failed to delete vehicle:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה במחיקת הרכב';
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline, user?.id, vehicles]);

  /**
   * הגדרת רכב כברירת מחדל - רק בשרת
   */
  const setDefaultVehicle = useCallback(async (vehicleId) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. הגדרת ברירת מחדל דורשת חיבור לאינטרנט.' 
      };
    }

    try {
      console.log('⭐ Setting default vehicle on server:', vehicleId);
      
      const response = await vehiclesAPI.setDefault(vehicleId);
      const updatedVehicles = response.data; // השרת מחזיר את כל הרכבים מעודכנים
      
      setVehicles(sortVehicles(updatedVehicles));
      
      // ניקוי cache רלוונטי
      if (user?.id) {
        optimizedAPI.clearCache(`user_vehicles:${user.id}`);
      }
      
      console.log('✅ Default vehicle set successfully');
      return { success: true, data: updatedVehicles };
      
    } catch (error) {
      console.error('❌ Failed to set default vehicle:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהגדרת רכב ברירת מחדל';
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * קבלת רכב ספציפי
   */
  const getVehicle = useCallback((vehicleId) => {
    return vehicles.find(vehicle => vehicle.id === vehicleId) || null;
  }, [vehicles]);

  /**
   * קבלת רכב ברירת המחדל
   */
  const getDefaultVehicleData = useCallback(() => {
    return getDefaultVehicle(vehicles);
  }, [vehicles]);

  /**
   * בדיקה אם מספר רכב קיים
   */
  const isLicensePlateExists = useCallback((licensePlate, excludeId = null) => {
    const formatted = formatLicensePlate(licensePlate);
    return vehicles.some(vehicle => 
      vehicle.id !== excludeId && 
      formatLicensePlate(vehicle.licensePlate) === formatted
    );
  }, [vehicles]);

  /**
   * סטטיסטיקות רכבים
   */
  const getVehicleStats = useCallback(() => {
    return {
      total: vehicles.length,
      hasDefault: hasDefaultVehicle(vehicles),
      defaultVehicle: getDefaultVehicle(vehicles),
      colors: [...new Set(vehicles.map(v => v.color).filter(Boolean))],
      makes: [...new Set(vehicles.map(v => v.make).filter(Boolean))],
      oldestYear: vehicles.length > 0 ? Math.min(...vehicles.map(v => v.year || new Date().getFullYear())) : null,
      newestYear: vehicles.length > 0 ? Math.max(...vehicles.map(v => v.year || new Date().getFullYear())) : null
    };
  }, [vehicles]);

  return {
    // נתונים
    vehicles,
    loading,
    refreshing,
    error,
    
    // פעולות
    loadVehicles,
    refreshVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    setDefaultVehicle,
    
    // עזרים
    getVehicle,
    getDefaultVehicle: getDefaultVehicleData,
    isLicensePlateExists,
    getVehicleStats,
    
    // פונקציות עזר
    formatLicensePlate,
    validateLicensePlate,
    getVehicleDisplayName,
    getColorDisplayName,
    sortVehicles,
    hasDefaultVehicle: () => hasDefaultVehicle(vehicles),
    
    // מצב
    isEmpty: vehicles.length === 0,
    isOnline: isFullyOnline,
    canManageVehicles: isAuthenticated && isFullyOnline,
    
    // הודעות
    statusMessage: !isAuthenticated ? 'נדרשת התחברות' :
                  !isFullyOnline ? 'אין חיבור לשרת' :
                  loading ? 'טוען רכבים...' :
                  error ? error :
                  vehicles.length === 0 ? 'אין רכבים' :
                  `${vehicles.length} רכבים`
  };
};

export default useServerOnlyVehicles;
