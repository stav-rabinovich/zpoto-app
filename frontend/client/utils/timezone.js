/**
 * 🕐 פונקציות עזר לניהול זמנים - Frontend
 * 
 * עקרון פעולה:
 * - המשתמש רואה ועובד עם זמן ישראל
 * - לפני שליחה לשרת - המרה ל-UTC
 * - אחרי קבלה מהשרת - המרה מ-UTC לתצוגה
 * - אין שימוש ב-offset קבוע (+2/+3)
 */

import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { isValid, addHours, addDays, parseISO } from 'date-fns';

// אזור הזמן הישראלי
const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

/**
 * המרת זמן מקומי (ישראלי) ל-UTC לפני שליחה לשרת
 * @param {string|Date} localTime - זמן בפורמט ISO או Date object בזמן ישראל
 * @returns {string} ISO string ב-UTC (עם Z בסוף)
 */
export function convertToUTC(localTime) {
  try {
    let localDate;
    
    if (typeof localTime === 'string') {
      localDate = parseISO(localTime);
      if (!isValid(localDate)) {
        throw new Error(`Invalid date string: ${localTime}`);
      }
    } else if (localTime instanceof Date) {
      localDate = localTime;
    } else {
      throw new Error(`Invalid input type: ${typeof localTime}`);
    }
    
    // המרה מזמן ישראל ל-UTC
    const utcDate = fromZonedTime(localDate, ISRAEL_TIMEZONE);
    const utcString = utcDate.toISOString();
    
    console.log(`🔄 convertToUTC: ${localTime} (Israel) -> ${utcString} (UTC)`);
    return utcString;
  } catch (error) {
    console.error('❌ convertToUTC error:', error);
    throw new Error(`Failed to convert to UTC: ${error.message}`);
  }
}

/**
 * המרת זמן UTC לזמן מקומי (ישראלי) לתצוגה
 * @param {string|Date} utcTime - זמן ב-UTC
 * @returns {Date} Date object בזמן ישראל
 */
export function convertFromUTC(utcTime) {
  try {
    let utcDate;
    
    if (typeof utcTime === 'string') {
      utcDate = parseISO(utcTime);
      if (!isValid(utcDate)) {
        throw new Error(`Invalid UTC date string: ${utcTime}`);
      }
    } else if (utcTime instanceof Date) {
      utcDate = utcTime;
    } else {
      throw new Error(`Invalid input type: ${typeof utcTime}`);
    }
    
    // המרה מ-UTC לזמן ישראל
    const israelDate = toZonedTime(utcDate, ISRAEL_TIMEZONE);
    
    console.log(`🔄 convertFromUTC: ${utcTime} (UTC) -> ${israelDate.toISOString()} (Israel)`);
    return israelDate;
  } catch (error) {
    console.error('❌ convertFromUTC error:', error);
    throw new Error(`Failed to convert from UTC: ${error.message}`);
  }
}

/**
 * פורמט זמן לתצוגה בזמן ישראל
 * @param {string|Date} utcTime - זמן ב-UTC
 * @param {string} formatString - פורמט התצוגה (ברירת מחדל: 'HH:mm')
 * @returns {string} מחרוזת מפורמטת בזמן ישראל
 */
export function formatForDisplay(utcTime, formatString = 'HH:mm') {
  try {
    let utcDate;
    
    if (typeof utcTime === 'string') {
      utcDate = parseISO(utcTime);
    } else {
      utcDate = utcTime;
    }
    
    if (!isValid(utcDate)) {
      throw new Error(`Invalid UTC date: ${utcTime}`);
    }
    
    const formatted = format(utcDate, formatString, { timeZone: ISRAEL_TIMEZONE });
    
    console.log(`🎨 formatForDisplay: ${utcTime} -> ${formatted} (${formatString})`);
    return formatted;
  } catch (error) {
    console.error('❌ formatForDisplay error:', error);
    return 'Invalid Time';
  }
}

/**
 * פורמט זמן לשליחה ל-API (תמיד UTC עם Z)
 * @param {string|Date} localTime - זמן בזמן ישראל
 * @returns {string} ISO string ב-UTC עם Z
 */
export function formatForAPI(localTime) {
  return convertToUTC(localTime);
}

/**
 * יצירת זמן נוכחי בזמן ישראל
 * @returns {Date} Date object בזמן ישראל
 */
export function nowInIsrael() {
  const utcNow = new Date();
  return convertFromUTC(utcNow);
}

/**
 * יצירת זמנים לחיפוש מיידי (עכשיו + X שעות)
 * @param {number} durationHours - משך בשעות (ברירת מחדל: 2)
 * @returns {Object} אובייקט עם startTime ו-endTime ב-UTC
 */
export function createImmediateSearchTimes(durationHours = 2) {
  try {
    const now = nowInIsrael();
    const endTime = addHours(now, durationHours);
    
    console.log('🔧 createImmediateSearchTimes - using Israel time:', {
      nowIsrael: now.toISOString(),
      endTimeIsrael: endTime.toISOString()
    });
    
    return {
      startTime: convertToUTC(now),      // המרה ל-UTC
      endTime: convertToUTC(endTime)     // המרה ל-UTC
    };
  } catch (error) {
    console.error('❌ createImmediateSearchTimes error:', error);
    throw error;
  }
}

/**
 * יצירת זמנים לחיפוש עתידי (תאריך + שעות ספציפיות)
 * @param {Date} date - תאריך בזמן ישראל
 * @param {number} startHour - שעת התחלה (0-23)
 * @param {number} endHour - שעת סיום (0-23)
 * @returns {Object} אובייקט עם startTime ו-endTime ב-UTC
 */
export function createFutureSearchTimes(date, startHour, endHour) {
  try {
    if (!isValid(date)) {
      throw new Error('Invalid date provided');
    }
    
    // שימוש בפונקציות העזר החדשות במקום setHours ישירות
    const startTime = setTimeInIsrael(date, startHour, 0);
    let endTime = setTimeInIsrael(date, endHour, 0);
    
    // אם שעת הסיום קטנה משעת ההתחלה, זה ביום הבא
    if (endHour <= startHour) {
      endTime = new Date(endTime.getTime() + (24 * 60 * 60 * 1000)); // הוסף יום
    }
    
    console.log('🔧 createFutureSearchTimes - using Israel time functions:', {
      inputDate: date.toISOString(),
      startHour,
      endHour,
      startTimeIsrael: startTime.toISOString(),
      endTimeIsrael: endTime.toISOString()
    });
    
    return {
      startTime: convertToUTC(startTime),  // המרה ל-UTC
      endTime: convertToUTC(endTime)       // המרה ל-UTC
    };
    return result;
  } catch (error) {
    console.error('❌ createFutureSearchTimes error:', error);
    throw error;
  }
}

/**
 * פונקציית עזר לחישוב שעות בצורה נכונה בזמן ישראל
 * @param {Date} israelDate - תאריך בזמן ישראל
 * @param {number} hours - מספר שעות להוסיף
 * @returns {Date} תאריך חדש בזמן ישראל
 */
export function addHoursInIsrael(israelDate, hours) {
  // במקום להשתמש ב-setHours ישירות, נוסיף מילישניות
  return new Date(israelDate.getTime() + (hours * 60 * 60 * 1000));
}

/**
 * פונקציית עזר ליצירת זמן בשעה מסוימת ביום נתון בזמן ישראל
 * @param {Date} date - התאריך בזמן ישראל
 * @param {number} hour - השעה (0-23)
 * @param {number} minute - הדקה (0-59)
 * @returns {Date} תאריך חדש בזמן ישראל
 */
export function setTimeInIsrael(date, hour, minute = 0) {
  // במקום setHours ישירות, נבנה תאריך חדש
  const israelDate = convertFromUTC(convertToUTC(date)); // וודא שזה בזמן ישראל
  const year = israelDate.getFullYear();
  const month = israelDate.getMonth();
  const day = israelDate.getDate();
  
  // יצירת תאריך חדש עם השעה הרצויה
  const newDate = new Date(year, month, day, hour, minute, 0, 0);
  
  console.log('🔧 setTimeInIsrael:', {
    input: date.toISOString(),
    targetHour: hour,
    targetMinute: minute,
    result: newDate.toISOString()
  });
  
  return newDate;
}

/**
 * קבלת השעה בזמן ישראל
 * @param {Date} date - תאריך (יכול להיות UTC או ישראל)
 * @returns {number} השעה בזמן ישראל (0-23)
 */
export function getIsraelHourFromDate(date) {
  const israelDate = convertFromUTC(convertToUTC(date));
  return israelDate.getHours();
}

/**
 * קבלת הדקות בזמן ישראל
 * @param {Date} date - תאריך (יכול להיות UTC או ישראל)
 * @returns {number} הדקות בזמן ישראל (0-59)
 */
export function getIsraelMinutesFromDate(date) {
  const israelDate = convertFromUTC(convertToUTC(date));
  return israelDate.getMinutes();
}

/**
 * בדיקת תקינות טווח זמנים
 * @param {string|Date} startTime - זמן התחלה
 * @param {string|Date} endTime - זמן סיום
 * @returns {boolean} true אם הטווח תקין
 */
export function validateTimeRange(startTime, endTime) {
  try {
    const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
    const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;
    
    if (!isValid(start) || !isValid(end)) {
      console.error('❌ Invalid dates in time range');
      return false;
    }
    
    if (start >= end) {
      console.error('❌ Start time must be before end time');
      return false;
    }
    
    // בדיקה שהטווח לא יותר מ-24 שעות
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      console.warn(`⚠️ Time range is ${diffHours} hours (>24h)`);
    }
    
    console.log(`✅ Valid time range: ${diffHours} hours`);
    return true;
  } catch (error) {
    console.error('❌ validateTimeRange error:', error);
    return false;
  }
}

/**
 * המרת פרמטרי חיפוש לפורמט API
 * @param {Object} searchParams - פרמטרי חיפוש
 * @returns {Object} פרמטרים מומרים לUTC
 */
export function prepareSearchParams(searchParams) {
  try {
    const prepared = { ...searchParams };
    
    // המרת זמנים ל-UTC אם קיימים
    if (searchParams.startTime) {
      prepared.startTime = formatForAPI(searchParams.startTime);
    }
    
    if (searchParams.endTime) {
      prepared.endTime = formatForAPI(searchParams.endTime);
    }
    
    console.log('🔄 prepareSearchParams:', {
      original: searchParams,
      prepared: prepared
    });
    
    return prepared;
  } catch (error) {
    console.error('❌ prepareSearchParams error:', error);
    return searchParams; // fallback
  }
}

/**
 * המרת תגובת API לתצוגה (UTC -> Israel)
 * @param {Object} apiResponse - תגובה מהשרת
 * @param {string[]} timeFields - שמות השדות עם זמנים
 * @returns {Object} תגובה מומרת לזמן ישראל
 */
export function processAPIResponse(apiResponse, timeFields = ['startTime', 'endTime', 'createdAt', 'updatedAt']) {
  try {
    if (!apiResponse) return apiResponse;
    
    const processed = { ...apiResponse };
    
    // המרת שדות זמן מ-UTC לישראל
    timeFields.forEach(field => {
      if (processed[field]) {
        processed[field + 'Local'] = convertFromUTC(processed[field]);
        processed[field + 'Display'] = formatForDisplay(processed[field]);
      }
    });
    
    // אם יש מערך של אובייקטים, המר גם אותם
    if (Array.isArray(processed.data)) {
      processed.data = processed.data.map(item => 
        processAPIResponse(item, timeFields)
      );
    }
    
    console.log('🔄 processAPIResponse: converted time fields');
    return processed;
  } catch (error) {
    console.error('❌ processAPIResponse error:', error);
    return apiResponse; // fallback
  }
}

/**
 * פונקציה לדיבוג - הצגת זמן בשני אזורי זמן
 * @param {Date|string} time - זמן לבדיקה
 * @param {string} label - תווית לזיהוי
 */
export function debugTime(time, label = 'Time') {
  try {
    const date = typeof time === 'string' ? parseISO(time) : time;
    
    if (!isValid(date)) {
      console.log(`🐛 ${label}: INVALID DATE`);
      return;
    }
    
    const utcString = date.toISOString();
    const israelString = formatForDisplay(date, 'yyyy-MM-dd HH:mm:ss');
    
    console.log(`🐛 ${label}:`);
    console.log(`   UTC: ${utcString}`);
    console.log(`   Israel: ${israelString}`);
  } catch (error) {
    console.error(`❌ debugTime error for ${label}:`, error);
  }
}

// ייצוא קבועים שימושיים
export const TIMEZONE_CONSTANTS = {
  ISRAEL_TIMEZONE,
  DAY_NAMES: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  HOUR_BLOCKS: [0, 4, 8, 12, 16, 20], // בלוקי זמן של 4 שעות
  FORMATS: {
    TIME_ONLY: 'HH:mm',
    DATE_ONLY: 'yyyy-MM-dd',
    DATETIME: 'yyyy-MM-dd HH:mm',
    FULL: 'yyyy-MM-dd HH:mm:ss'
  }
};
