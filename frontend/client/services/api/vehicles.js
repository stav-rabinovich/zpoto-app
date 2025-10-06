import api from '../../utils/api';

/**
 * שירותי API לרכבים
 */

/**
 * קבלת כל הרכבים של המשתמש המחובר
 * @returns {Promise} רשימת רכבים
 */
export const getUserVehicles = async () => {
  try {
    const response = await api.get('/api/vehicles');
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('Failed to fetch user vehicles:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת הרכבים',
      data: []
    };
  }
};

/**
 * יצירת רכב חדש
 * @param {Object} vehicleData - נתוני הרכב
 * @param {string} vehicleData.licensePlate - מספר רכב (חובה)
 * @param {string} vehicleData.make - יצרן (אופציונלי)
 * @param {string} vehicleData.model - דגם (אופציונלי)
 * @param {string} vehicleData.color - צבע (אופציונלי)
 * @param {number} vehicleData.year - שנת ייצור (אופציונלי)
 * @param {string} vehicleData.description - תיאור (אופציונלי)
 * @param {boolean} vehicleData.isDefault - האם זה רכב ברירת מחדל
 * @returns {Promise} תוצאת יצירת הרכב
 */
export const createVehicle = async (vehicleData) => {
  try {
    const response = await api.post('/api/vehicles', vehicleData);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to create vehicle:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה ביצירת הרכב',
      data: null
    };
  }
};

/**
 * עדכון רכב קיים
 * @param {number} vehicleId - מזהה הרכב
 * @param {Object} vehicleData - נתוני הרכב המעודכנים
 * @returns {Promise} תוצאת עדכון הרכב
 */
export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const response = await api.put(`/api/vehicles/${vehicleId}`, vehicleData);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to update vehicle:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בעדכון הרכב',
      data: null
    };
  }
};

/**
 * מחיקת רכב
 * @param {number} vehicleId - מזהה הרכב
 * @returns {Promise} תוצאת מחיקת הרכב
 */
export const deleteVehicle = async (vehicleId) => {
  try {
    const response = await api.delete(`/api/vehicles/${vehicleId}`);
    return {
      success: true,
      message: response.data.message || 'הרכב נמחק בהצלחה'
    };
  } catch (error) {
    console.error('Failed to delete vehicle:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה במחיקת הרכב'
    };
  }
};

/**
 * הגדרת רכב כברירת מחדל
 * @param {number} vehicleId - מזהה הרכב
 * @returns {Promise} תוצאת הגדרת ברירת המחדל
 */
export const setDefaultVehicle = async (vehicleId) => {
  try {
    const response = await api.patch(`/api/vehicles/${vehicleId}/default`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to set default vehicle:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בהגדרת רכב ברירת מחדל'
    };
  }
};

/**
 * פונקציות עזר לרכבים
 */

/**
 * קבלת רכב ברירת המחדל
 * @param {Array} vehicles - רשימת רכבים
 * @returns {Object|null} הרכב ברירת המחדל או null
 */
export const getDefaultVehicle = (vehicles) => {
  if (!Array.isArray(vehicles)) return null;
  return vehicles.find(vehicle => vehicle.isDefault) || null;
};

/**
 * פורמט מספר רכב להצגה
 * @param {string} licensePlate - מספר רכב
 * @returns {string} מספר רכב מפורמט
 */
export const formatLicensePlate = (licensePlate) => {
  if (!licensePlate) return '';
  
  // הסרת רווחים ומקפים
  const cleaned = licensePlate.replace(/[\s-]/g, '');
  
  // פורמט ישראלי: 123-45-678
  if (cleaned.length === 8 && /^\d+$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 8)}`;
  }
  
  // פורמט ישראלי חדש: 12-345-67
  if (cleaned.length === 7 && /^\d+$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}`;
  }
  
  return licensePlate; // החזרת המקור אם לא מתאים לפורמט
};

/**
 * ולידציה של מספר רכב ישראלי
 * @param {string} licensePlate - מספר רכב
 * @returns {boolean} האם המספר תקין
 */
export const validateLicensePlate = (licensePlate) => {
  if (!licensePlate) return false;
  
  const cleaned = licensePlate.replace(/[\s-]/g, '');
  
  // בדיקת פורמט ישראלי (7 או 8 ספרות)
  return /^\d{7,8}$/.test(cleaned);
};

/**
 * יצירת תיאור רכב מלא
 * @param {Object} vehicle - אובייקט הרכב
 * @returns {string} תיאור הרכב
 */
export const getVehicleDisplayName = (vehicle) => {
  if (!vehicle) return '';
  
  const parts = [];
  
  if (vehicle.make) parts.push(vehicle.make);
  if (vehicle.model) parts.push(vehicle.model);
  if (vehicle.year) parts.push(`(${vehicle.year})`);
  
  if (parts.length === 0) {
    return vehicle.licensePlate || 'רכב ללא שם';
  }
  
  return parts.join(' ');
};

/**
 * קבלת צבע רכב להצגה
 * @param {string} color - צבע הרכב
 * @returns {string} צבע מתורגם
 */
export const getColorDisplayName = (color) => {
  if (!color) return '';
  
  const colorMap = {
    'white': 'לבן',
    'black': 'שחור',
    'silver': 'כסף',
    'gray': 'אפור',
    'grey': 'אפור',
    'red': 'אדום',
    'blue': 'כחול',
    'green': 'ירוק',
    'yellow': 'צהוב',
    'orange': 'כתום',
    'brown': 'חום',
    'purple': 'סגול',
    'pink': 'ורוד'
  };
  
  return colorMap[color.toLowerCase()] || color;
};

/**
 * מיון רכבים (ברירת מחדל קודם, אחר כך לפי תאריך יצירה)
 * @param {Array} vehicles - רשימת רכבים
 * @returns {Array} רשימת רכבים ממוינת
 */
export const sortVehicles = (vehicles) => {
  if (!Array.isArray(vehicles)) return [];
  
  return [...vehicles].sort((a, b) => {
    // ברירת מחדל קודם
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    
    // אחר כך לפי תאריך יצירה (חדש יותר קודם)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

/**
 * בדיקה אם יש רכב ברירת מחדל
 * @param {Array} vehicles - רשימת רכבים
 * @returns {boolean} האם יש רכב ברירת מחדל
 */
export const hasDefaultVehicle = (vehicles) => {
  if (!Array.isArray(vehicles)) return false;
  return vehicles.some(vehicle => vehicle.isDefault);
};
