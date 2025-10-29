/**
 * כלי validation לresponses מהשרת
 * מבטיח שהנתונים שמגיעים מהשרת תקינים ובטוחים
 */

/**
 * בדיקה אם response תקין
 * @param {Object} response - Response מהשרת
 * @returns {boolean} האם תקין
 */
export const isValidResponse = (response) => {
  return response && 
         typeof response === 'object' && 
         response.data !== undefined;
};

/**
 * בדיקה אם booking תקין
 * @param {Object} booking - אובייקט הזמנה
 * @returns {boolean} האם תקין
 */
export const isValidBooking = (booking) => {
  if (!booking || typeof booking !== 'object') return false;
  
  const requiredFields = ['id', 'startTime', 'endTime', 'status'];
  return requiredFields.every(field => booking[field] !== undefined);
};

/**
 * בדיקה אם parking תקין
 * @param {Object} parking - אובייקט חניה
 * @returns {boolean} האם תקין
 */
export const isValidParking = (parking) => {
  if (!parking || typeof parking !== 'object') return false;
  
  const requiredFields = ['id', 'title', 'lat', 'lng'];
  return requiredFields.every(field => parking[field] !== undefined);
};

/**
 * בדיקה אם user תקין
 * @param {Object} user - אובייקט משתמש
 * @returns {boolean} האם תקין
 */
export const isValidUser = (user) => {
  if (!user || typeof user !== 'object') return false;
  
  return user.id !== undefined && 
         user.email !== undefined &&
         typeof user.email === 'string' &&
         user.email.includes('@');
};

/**
 * ניקוי נתונים מהשרת - הסרת תווים מסוכנים
 * @param {string} text - טקסט לניקוי
 * @returns {string} טקסט נקי
 */
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // הסרת scripts
    .replace(/<[^>]*>/g, '') // הסרת HTML tags
    .trim();
};

/**
 * בדיקה אם מספר תקין
 * @param {any} value - ערך לבדיקה
 * @param {number} min - מינימום
 * @param {number} max - מקסימום
 * @returns {boolean} האם תקין
 */
export const isValidNumber = (value, min = -Infinity, max = Infinity) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * בדיקה אם תאריך תקין
 * @param {any} dateValue - תאריך לבדיקה
 * @returns {boolean} האם תקין
 */
export const isValidDate = (dateValue) => {
  const date = new Date(dateValue);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * validation מלא לרשימת הזמנות
 * @param {Array} bookings - רשימת הזמנות
 * @returns {Array} רשימת הזמנות מסוננת ותקינה
 */
export const validateBookings = (bookings) => {
  if (!Array.isArray(bookings)) return [];
  
  return bookings
    .filter(isValidBooking)
    .map(booking => ({
      ...booking,
      // ניקוי שדות טקסט
      parking: booking.parking ? {
        ...booking.parking,
        title: sanitizeText(booking.parking.title),
        address: sanitizeText(booking.parking.address)
      } : null
    }));
};

/**
 * validation מלא לרשימת מועדפים
 * @param {Array} favorites - רשימת מועדפים
 * @returns {Array} רשימת מועדפים מסוננת ותקינה
 */
export const validateFavorites = (favorites) => {
  if (!Array.isArray(favorites)) return [];
  
  return favorites
    .filter(fav => fav && fav.parking && isValidParking(fav.parking))
    .map(fav => ({
      ...fav,
      parking: {
        ...fav.parking,
        title: sanitizeText(fav.parking.title),
        address: sanitizeText(fav.parking.address)
      }
    }));
};
