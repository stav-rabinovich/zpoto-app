/**
 * כלי אבטחה לאפליקציה
 */

/**
 * בדיקה אם URL בטוח לקריאה
 * @param {string} url - URL לבדיקה
 * @returns {boolean} האם בטוח
 */
export const isSafeUrl = (url) => {
  if (typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // רק HTTP/HTTPS מותרים
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * בדיקה אם טוקן תקין (בסיסי)
 * @param {string} token - טוקן לבדיקה
 * @returns {boolean} האם תקין
 */
export const isValidToken = (token) => {
  if (typeof token !== 'string' || token.length < 10) return false;
  
  // בדיקה בסיסית לפורמט JWT
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * הסרת תווים מסוכנים מקלט משתמש
 * @param {string} input - קלט משתמש
 * @returns {string} קלט נקי
 */
export const sanitizeUserInput = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // הסרת < >
    .replace(/javascript:/gi, '') // הסרת javascript:
    .replace(/on\w+=/gi, '') // הסרת event handlers
    .trim()
    .slice(0, 1000); // הגבלת אורך
};

/**
 * בדיקה אם אימייל תקין
 * @param {string} email - אימייל לבדיקה
 * @returns {boolean} האם תקין
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * בדיקה אם מספר טלפון תקין (ישראלי)
 * @param {string} phone - מספר טלפון
 * @returns {boolean} האם תקין
 */
export const isValidPhone = (phone) => {
  if (typeof phone !== 'string') return false;
  
  // הסרת רווחים ומקפים
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // פורמטים ישראליים: 05X-XXXXXXX או 972-5X-XXXXXXX
  const israeliRegex = /^(05\d{8}|9725\d{8})$/;
  return israeliRegex.test(cleaned);
};

/**
 * הצפנה בסיסית לנתונים רגישים (לא לסיסמאות!)
 * @param {string} text - טקסט להצפנה
 * @returns {string} טקסט מוצפן
 */
export const simpleEncrypt = (text) => {
  if (typeof text !== 'string') return '';
  
  // הצפנה בסיסית - רק לנתונים לא קריטיים
  return btoa(encodeURIComponent(text));
};

/**
 * פענוח הצפנה בסיסית
 * @param {string} encrypted - טקסט מוצפן
 * @returns {string} טקסט מפוענח
 */
export const simpleDecrypt = (encrypted) => {
  try {
    return decodeURIComponent(atob(encrypted));
  } catch {
    return '';
  }
};

/**
 * יצירת headers בטוחים לAPI calls
 * @param {string} token - טוקן אימות
 * @returns {Object} headers
 */
export const createSecureHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token && isValidToken(token)) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * בדיקה אם response מהשרת בטוח
 * @param {Object} response - response מהשרת
 * @returns {boolean} האם בטוח
 */
export const isSecureResponse = (response) => {
  if (!response || typeof response !== 'object') return false;
  
  // בדיקה שאין קוד זדוני בresponse
  const responseStr = JSON.stringify(response);
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
    /function\(/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(responseStr));
};
