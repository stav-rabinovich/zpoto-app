/**
 * General Utilities - פונקציות עזר כלליות
 * מטרה: לרכז פונקציות שחוזרות על עצמן
 */

/**
 * פורמט תאריך לעברית
 * @param {Date|string} date - התאריך לפורמט
 * @param {string} format - סוג הפורמט ('short', 'long', 'time')
 * @returns {string} תאריך מפורמט
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    short: { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    },
    long: { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    },
    time: { 
      hour: '2-digit', 
      minute: '2-digit' 
    },
    datetime: { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    }
  };
  
  return dateObj.toLocaleDateString('he-IL', options[format]);
};

/**
 * חישוב דמי תפעול (10%)
 * @param {number} amount - הסכום הבסיסי
 * @returns {number} דמי התפעול
 */
export const calculateOperationalFee = (amount) => {
  if (!amount || amount <= 0) return 0;
  return Math.round(amount * 0.1 * 100) / 100; // עיגול ל-2 ספרות אחרי הנקודה
};

/**
 * פורמט מספר לוחית רישוי
 * @param {string} plate - מספר הלוחית
 * @returns {string} לוחית מפורמטת
 */
export const formatLicensePlate = (plate) => {
  if (!plate) return '';
  
  // הסרת רווחים ותווים מיוחדים
  const cleaned = plate.replace(/[^0-9א-ת]/g, '');
  
  // פורמט ישראלי: 123-45-678 או 12-345-67
  if (cleaned.length >= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  } else if (cleaned.length >= 5) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }
  
  return cleaned;
};

/**
 * ולידציה לאימייל
 * @param {string} email - כתובת האימייל
 * @returns {boolean} האם האימייל תקין
 */
export const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * ולידציה לטלפון ישראלי
 * @param {string} phone - מספר הטלפון
 * @returns {boolean} האם הטלפון תקין
 */
export const validateIsraeliPhone = (phone) => {
  if (!phone) return false;
  
  // הסרת תווים מיוחדים
  const cleaned = phone.replace(/[^0-9]/g, '');
  
  // פורמטים תקינים: 05X-XXXXXXX, 03-XXXXXXX, 02-XXXXXXX
  const phoneRegex = /^(05[0-9]|0[2-4]|0[7-9])[0-9]{7}$/;
  return phoneRegex.test(cleaned);
};

/**
 * חישוב מרחק בין שתי נקודות (בק"מ)
 * @param {number} lat1 - קו רוחב 1
 * @param {number} lon1 - קו אורך 1
 * @param {number} lat2 - קו רוחב 2
 * @param {number} lon2 - קו אורך 2
 * @returns {number} מרחק בק"מ
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * דיבאונס לפונקציות
 * @param {Function} func - הפונקציה לדיבאונס
 * @param {number} wait - זמן ההמתנה במילישניות
 * @returns {Function} פונקציה מדובאנסת
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * פורמט מחיר בשקלים
 * @param {number} amount - הסכום
 * @param {boolean} showCurrency - האם להציג סמל מטבע
 * @returns {string} מחיר מפורמט
 */
export const formatPrice = (amount, showCurrency = true) => {
  if (!amount && amount !== 0) return showCurrency ? '₪0.00' : '0.00';
  
  const formatted = Number(amount).toFixed(2);
  return showCurrency ? `₪${formatted}` : formatted;
};

/**
 * קיצור טקסט
 * @param {string} text - הטקסט לקיצור
 * @param {number} maxLength - אורך מקסימלי
 * @returns {string} טקסט מקוצר
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * המרת זמן לפורמט קריא
 * @param {number} minutes - דקות
 * @returns {string} זמן מפורמט
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0 דקות';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes} דקות`;
  } else if (remainingMinutes === 0) {
    return `${hours} שעות`;
  } else {
    return `${hours} שעות ו-${remainingMinutes} דקות`;
  }
};
