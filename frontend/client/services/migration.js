import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserBookings, createBooking } from './api/bookings';
import { getUserVehicles, createVehicle } from './api/vehicles';
import { getUserProfile, updateUserProfile } from './api/profile';

/**
 * שירות להעברת נתונים מ-AsyncStorage לשרת
 */

/**
 * מפתחות AsyncStorage הקיימים
 */
const STORAGE_KEYS = {
  BOOKINGS: 'bookings',
  VEHICLES: 'vehicles', 
  USER_PROFILE: 'userProfile',
  SETTINGS: 'settings',
  FAVORITES: 'favorites',
  SEARCH_HISTORY: 'searchHistory'
};

/**
 * העברת כל הנתונים מ-AsyncStorage לשרת
 * @param {Function} onProgress - callback לעדכון התקדמות (אופציונלי)
 * @returns {Promise} תוצאת ההעברה
 */
export const migrateAllData = async (onProgress = null) => {
  const results = {
    success: true,
    migrated: {
      bookings: 0,
      vehicles: 0,
      profile: false
    },
    errors: [],
    skipped: []
  };

  try {
    // שלב 1: העברת פרופיל משתמש
    if (onProgress) onProgress({ step: 'profile', progress: 10 });
    const profileResult = await migrateUserProfile();
    results.migrated.profile = profileResult.success;
    if (!profileResult.success) {
      results.errors.push(`פרופיל: ${profileResult.error}`);
    }

    // שלב 2: העברת רכבים
    if (onProgress) onProgress({ step: 'vehicles', progress: 30 });
    const vehiclesResult = await migrateVehicles();
    results.migrated.vehicles = vehiclesResult.migrated;
    if (vehiclesResult.errors.length > 0) {
      results.errors.push(...vehiclesResult.errors);
    }

    // שלב 3: העברת הזמנות
    if (onProgress) onProgress({ step: 'bookings', progress: 60 });
    const bookingsResult = await migrateBookings();
    results.migrated.bookings = bookingsResult.migrated;
    if (bookingsResult.errors.length > 0) {
      results.errors.push(...bookingsResult.errors);
    }

    // שלב 4: ניקוי נתונים מקומיים (אופציונלי)
    if (onProgress) onProgress({ step: 'cleanup', progress: 90 });
    
    if (onProgress) onProgress({ step: 'complete', progress: 100 });

    // אם יש שגיאות, המיגרציה לא הצליחה לחלוטין
    if (results.errors.length > 0) {
      results.success = false;
    }

    return results;
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      migrated: results.migrated,
      errors: [...results.errors, `שגיאה כללית: ${error.message}`],
      skipped: results.skipped
    };
  }
};

/**
 * העברת פרופיל משתמש
 * @returns {Promise} תוצאת ההעברה
 */
export const migrateUserProfile = async () => {
  try {
    // קבלת פרופיל מקומי
    const localProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!localProfile) {
      return { success: true, message: 'אין פרופיל מקומי להעברה' };
    }

    const profileData = JSON.parse(localProfile);
    
    // קבלת פרופיל נוכחי מהשרת
    const serverProfileResult = await getUserProfile();
    if (!serverProfileResult.success) {
      return { success: false, error: 'לא ניתן לקבל פרופיל מהשרת' };
    }

    // עדכון רק אם יש נתונים חדשים
    const updateData = {};
    if (profileData.name && !serverProfileResult.data.name) {
      updateData.name = profileData.name;
    }
    if (profileData.phone && !serverProfileResult.data.phone) {
      updateData.phone = profileData.phone;
    }

    if (Object.keys(updateData).length > 0) {
      const updateResult = await updateUserProfile(updateData);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }
    }

    return { success: true, message: 'פרופיל הועבר בהצלחה' };
  } catch (error) {
    console.error('Failed to migrate user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * העברת רכבים
 * @returns {Promise} תוצאת ההעברה
 */
export const migrateVehicles = async () => {
  const results = { migrated: 0, errors: [], skipped: [] };

  try {
    // קבלת רכבים מקומיים
    const localVehicles = await AsyncStorage.getItem(STORAGE_KEYS.VEHICLES);
    if (!localVehicles) {
      return { ...results, message: 'אין רכבים מקומיים להעברה' };
    }

    const vehiclesData = JSON.parse(localVehicles);
    if (!Array.isArray(vehiclesData) || vehiclesData.length === 0) {
      return { ...results, message: 'אין רכבים מקומיים להעברה' };
    }

    // קבלת רכבים קיימים מהשרת
    const serverVehiclesResult = await getUserVehicles();
    if (!serverVehiclesResult.success) {
      results.errors.push('לא ניתן לקבל רכבים מהשרת');
      return results;
    }

    const existingPlates = serverVehiclesResult.data.map(v => v.licensePlate);

    // העברת כל רכב
    for (const vehicle of vehiclesData) {
      try {
        // בדיקה אם הרכב כבר קיים
        if (existingPlates.includes(vehicle.licensePlate)) {
          results.skipped.push(`רכב ${vehicle.licensePlate} כבר קיים`);
          continue;
        }

        // יצירת רכב חדש
        const createResult = await createVehicle({
          licensePlate: vehicle.licensePlate,
          make: vehicle.make || null,
          model: vehicle.model || null,
          color: vehicle.color || null,
          year: vehicle.year || null,
          description: vehicle.description || null,
          isDefault: vehicle.isDefault || false
        });

        if (createResult.success) {
          results.migrated++;
        } else {
          results.errors.push(`רכב ${vehicle.licensePlate}: ${createResult.error}`);
        }
      } catch (error) {
        results.errors.push(`רכב ${vehicle.licensePlate}: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to migrate vehicles:', error);
    results.errors.push(`שגיאה כללית: ${error.message}`);
    return results;
  }
};

/**
 * העברת הזמנות
 * @returns {Promise} תוצאת ההעברה
 */
export const migrateBookings = async () => {
  const results = { migrated: 0, errors: [], skipped: [] };

  try {
    // קבלת הזמנות מקומיות
    const localBookings = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!localBookings) {
      return { ...results, message: 'אין הזמנות מקומיות להעברה' };
    }

    const bookingsData = JSON.parse(localBookings);
    if (!Array.isArray(bookingsData) || bookingsData.length === 0) {
      return { ...results, message: 'אין הזמנות מקומיות להעברה' };
    }

    // קבלת הזמנות קיימות מהשרת
    const serverBookingsResult = await getUserBookings();
    if (!serverBookingsResult.success) {
      results.errors.push('לא ניתן לקבל הזמנות מהשרת');
      return results;
    }

    // יצירת מפתח לזיהוי הזמנות קיימות
    const existingBookings = new Set(
      serverBookingsResult.data.map(b => 
        `${b.parkingId}-${b.startTime}-${b.endTime}`
      )
    );

    // העברת כל הזמנה
    for (const booking of bookingsData) {
      try {
        const bookingKey = `${booking.parkingId}-${booking.startTime}-${booking.endTime}`;
        
        // בדיקה אם ההזמנה כבר קיימת
        if (existingBookings.has(bookingKey)) {
          results.skipped.push(`הזמנה ${bookingKey} כבר קיימת`);
          continue;
        }

        // יצירת הזמנה חדשה
        const createResult = await createBooking({
          parkingId: booking.parkingId,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status || 'CONFIRMED'
        });

        if (createResult.success) {
          results.migrated++;
        } else {
          results.errors.push(`הזמנה ${bookingKey}: ${createResult.error}`);
        }
      } catch (error) {
        results.errors.push(`הזמנה: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to migrate bookings:', error);
    results.errors.push(`שגיאה כללית: ${error.message}`);
    return results;
  }
};

/**
 * ניקוי נתונים מקומיים לאחר העברה מוצלחת
 * @param {Array} keysToClean - מפתחות לניקוי (אופציונלי)
 * @returns {Promise} תוצאת הניקוי
 */
export const cleanupLocalData = async (keysToClean = null) => {
  try {
    const keys = keysToClean || Object.values(STORAGE_KEYS);
    
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }

    return { success: true, message: 'נתונים מקומיים נוקו בהצלחה' };
  } catch (error) {
    console.error('Failed to cleanup local data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * בדיקה אם יש נתונים מקומיים להעברה
 * @returns {Promise} מידע על נתונים מקומיים
 */
export const checkLocalData = async () => {
  const results = {
    hasData: false,
    counts: {
      bookings: 0,
      vehicles: 0,
      profile: false
    }
  };

  try {
    // בדיקת הזמנות
    const bookings = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (bookings) {
      const bookingsData = JSON.parse(bookings);
      if (Array.isArray(bookingsData)) {
        results.counts.bookings = bookingsData.length;
        results.hasData = true;
      }
    }

    // בדיקת רכבים
    const vehicles = await AsyncStorage.getItem(STORAGE_KEYS.VEHICLES);
    if (vehicles) {
      const vehiclesData = JSON.parse(vehicles);
      if (Array.isArray(vehiclesData)) {
        results.counts.vehicles = vehiclesData.length;
        results.hasData = true;
      }
    }

    // בדיקת פרופיל
    const profile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (profile) {
      results.counts.profile = true;
      results.hasData = true;
    }

    return results;
  } catch (error) {
    console.error('Failed to check local data:', error);
    return results;
  }
};

/**
 * גיבוי נתונים מקומיים לפני העברה
 * @returns {Promise} תוצאת הגיבוי
 */
export const backupLocalData = async () => {
  try {
    const backup = {};
    const keys = Object.values(STORAGE_KEYS);

    for (const key of keys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        backup[key] = data;
      }
    }

    const backupKey = `backup_${Date.now()}`;
    await AsyncStorage.setItem(backupKey, JSON.stringify(backup));

    return { 
      success: true, 
      backupKey,
      message: 'גיבוי נתונים הושלם בהצלחה' 
    };
  } catch (error) {
    console.error('Failed to backup local data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * שחזור נתונים מגיבוי
 * @param {string} backupKey - מפתח הגיבוי
 * @returns {Promise} תוצאת השחזור
 */
export const restoreFromBackup = async (backupKey) => {
  try {
    const backupData = await AsyncStorage.getItem(backupKey);
    if (!backupData) {
      return { success: false, error: 'גיבוי לא נמצא' };
    }

    const backup = JSON.parse(backupData);
    
    for (const [key, data] of Object.entries(backup)) {
      await AsyncStorage.setItem(key, data);
    }

    return { success: true, message: 'שחזור מגיבוי הושלם בהצלחה' };
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return { success: false, error: error.message };
  }
};

/**
 * קבלת רשימת גיבויים זמינים
 * @returns {Promise} רשימת גיבויים
 */
export const getAvailableBackups = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const backupKeys = keys.filter(key => key.startsWith('backup_'));
    
    const backups = [];
    for (const key of backupKeys) {
      const timestamp = key.replace('backup_', '');
      const date = new Date(parseInt(timestamp));
      backups.push({
        key,
        timestamp: parseInt(timestamp),
        date: date.toLocaleString('he-IL'),
        size: 0 // יכול להוסיף חישוב גודל אם נדרש
      });
    }

    return { success: true, data: backups.sort((a, b) => b.timestamp - a.timestamp) };
  } catch (error) {
    console.error('Failed to get available backups:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * מחיקת גיבוי ספציפי
 * @param {string} backupKey - מפתח הגיבוי למחיקה
 * @returns {Promise} תוצאת המחיקה
 */
export const deleteBackup = async (backupKey) => {
  try {
    await AsyncStorage.removeItem(backupKey);
    return { success: true, message: 'גיבוי נמחק בהצלחה' };
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return { success: false, error: error.message };
  }
};

/**
 * מחיקת כל הגיבויים
 * @returns {Promise} תוצאת המחיקה
 */
export const deleteAllBackups = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const backupKeys = keys.filter(key => key.startsWith('backup_'));
    
    for (const key of backupKeys) {
      await AsyncStorage.removeItem(key);
    }

    return { success: true, message: `${backupKeys.length} גיבויים נמחקו בהצלחה` };
  } catch (error) {
    console.error('Failed to delete all backups:', error);
    return { success: false, error: error.message };
  }
};

/**
 * בדיקת תקינות נתונים לפני מיגרציה
 * @returns {Promise} תוצאת הבדיקה
 */
export const validateDataIntegrity = async () => {
  const results = {
    valid: true,
    issues: [],
    warnings: []
  };

  try {
    // בדיקת הזמנות
    const bookings = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (bookings) {
      const bookingsData = JSON.parse(bookings);
      if (Array.isArray(bookingsData)) {
        bookingsData.forEach((booking, index) => {
          if (!booking.startTime || !booking.endTime) {
            results.issues.push(`הזמנה ${index + 1}: חסרים תאריכים`);
            results.valid = false;
          }
          if (!booking.parkingId) {
            results.warnings.push(`הזמנה ${index + 1}: חסר מזהה חניה`);
          }
        });
      }
    }

    // בדיקת רכבים
    const vehicles = await AsyncStorage.getItem(STORAGE_KEYS.VEHICLES);
    if (vehicles) {
      const vehiclesData = JSON.parse(vehicles);
      if (Array.isArray(vehiclesData)) {
        vehiclesData.forEach((vehicle, index) => {
          if (!vehicle.licensePlate && !vehicle.plate) {
            results.issues.push(`רכב ${index + 1}: חסר מספר רכב`);
            results.valid = false;
          }
        });
      }
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Failed to validate data integrity:', error);
    return { 
      success: false, 
      error: error.message,
      data: { valid: false, issues: ['שגיאה בבדיקת תקינות הנתונים'], warnings: [] }
    };
  }
};
