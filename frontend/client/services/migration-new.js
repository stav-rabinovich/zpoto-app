/**
 * שירות מיגרציה - בוטל
 * המערכת עובדת כעת 100% מול השרת
 */

export const migrateAllData = async (onProgress = null) => {
  console.log('📝 Migration disabled - system is 100% server-based');
  return {
    success: true,
    message: 'מיגרציה בוטלה - המערכת עובדת 100% מול השרת',
    migrated: { bookings: 0, vehicles: 0, profile: false },
    errors: []
  };
};

export const migrateUserProfile = async () => {
  console.log('📝 Profile migration disabled');
  return { success: true, message: 'מיגרציית פרופיל בוטלה' };
};

export const migrateUserVehicles = async () => {
  console.log('📝 Vehicles migration disabled');
  return { success: true, message: 'מיגרציית רכבים בוטלה' };
};

export const migrateUserBookings = async () => {
  console.log('📝 Bookings migration disabled');
  return { success: true, message: 'מיגרציית הזמנות בוטלה' };
};

export const cleanupLocalData = async () => {
  console.log('📝 Local data cleanup disabled');
  return { success: true, message: 'ניקוי נתונים מקומיים בוטל' };
};

export const checkLocalData = async () => {
  console.log('📝 Local data check disabled');
  return {
    hasData: false,
    counts: { bookings: 0, vehicles: 0, profile: false },
    message: 'בדיקת נתונים מקומיים בוטלה'
  };
};

export const backupLocalData = async () => {
  console.log('📝 Local data backup disabled');
  return { success: true, message: 'גיבוי נתונים מקומיים בוטל' };
};

export const restoreFromBackup = async (backupKey) => {
  console.log('📝 Backup restore disabled');
  return { success: true, message: 'שחזור מגיבוי בוטל' };
};

export const getAvailableBackups = async () => {
  console.log('📝 Backup listing disabled');
  return [];
};

export const deleteBackup = async (backupKey) => {
  console.log('📝 Backup deletion disabled');
  return { success: true, message: 'מחיקת גיבוי בוטלה' };
};

export const deleteAllBackups = async () => {
  console.log('📝 All backups deletion disabled');
  return { success: true, message: 'מחיקת כל הגיבויים בוטלה' };
};

export const getFallbackStats = async () => {
  console.log('📝 Fallback stats disabled');
  return {
    totalItems: 0,
    bookings: 0,
    vehicles: 0,
    hasProfile: false,
    message: 'סטטיסטיקות fallback בוטלו'
  };
};
