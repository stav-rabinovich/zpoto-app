"use strict";
/**
 * 🕐 פונקציות עזר לניהול זמנים - Backend
 *
 * עקרון פעולה:
 * - כל הזמנים במסד הנתונים ב-UTC
 * - כל החישובים הפנימיים ב-UTC
 * - המרה ל-Asia/Jerusalem רק לתצוגה או לוגיקה עסקית
 * - אין שימוש ב-offset קבוע (+2/+3)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMEZONE_CONSTANTS = void 0;
exports.toUTC = toUTC;
exports.fromUTC = fromUTC;
exports.formatIsraelTime = formatIsraelTime;
exports.isValidIsraelDate = isValidIsraelDate;
exports.validateTimeRange = validateTimeRange;
exports.getIsraelDayOfWeek = getIsraelDayOfWeek;
exports.getIsraelHour = getIsraelHour;
exports.createIsraelDate = createIsraelDate;
exports.debugTime = debugTime;
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
// אזור הזמן הישראלי
const ISRAEL_TIMEZONE = 'Asia/Jerusalem';
/**
 * המרת זמן מקומי (ישראלי) ל-UTC
 * @param localTime - זמן בפורמט ISO או Date object בזמן ישראל
 * @returns Date object ב-UTC
 */
function toUTC(localTime) {
    try {
        let localDate;
        if (typeof localTime === 'string') {
            localDate = (0, date_fns_1.parseISO)(localTime);
            if (!(0, date_fns_1.isValid)(localDate)) {
                throw new Error(`Invalid date string: ${localTime}`);
            }
        }
        else {
            localDate = localTime;
        }
        // המרה מזמן ישראל ל-UTC
        const utcDate = (0, date_fns_tz_1.fromZonedTime)(localDate, ISRAEL_TIMEZONE);
        console.log(`🔄 toUTC: ${localTime} (Israel) -> ${utcDate.toISOString()} (UTC)`);
        return utcDate;
    }
    catch (error) {
        console.error('❌ toUTC error:', error);
        throw new Error(`Failed to convert to UTC: ${error?.message || error}`);
    }
}
/**
 * המרת זמן UTC לזמן מקומי (ישראלי)
 * @param utcTime - Date object ב-UTC
 * @returns Date object בזמן ישראל
 */
function fromUTC(utcTime) {
    try {
        if (!(0, date_fns_1.isValid)(utcTime)) {
            throw new Error(`Invalid UTC date: ${utcTime}`);
        }
        // המרה מ-UTC לזמן ישראל
        const israelDate = (0, date_fns_tz_1.toZonedTime)(utcTime, ISRAEL_TIMEZONE);
        console.log(`🔄 fromUTC: ${utcTime.toISOString()} (UTC) -> ${israelDate.toISOString()} (Israel)`);
        return israelDate;
    }
    catch (error) {
        console.error('❌ fromUTC error:', error);
        throw new Error(`Failed to convert from UTC: ${error?.message || error}`);
    }
}
/**
 * פורמט זמן לתצוגה בזמן ישראל
 * @param utcTime - Date object ב-UTC
 * @param formatString - פורמט התצוגה (ברירת מחדל: 'HH:mm')
 * @returns מחרוזת מפורמטת בזמן ישראל
 */
function formatIsraelTime(utcTime, formatString = 'HH:mm') {
    try {
        if (!(0, date_fns_1.isValid)(utcTime)) {
            throw new Error(`Invalid UTC date: ${utcTime}`);
        }
        const formatted = (0, date_fns_tz_1.format)(utcTime, formatString, { timeZone: ISRAEL_TIMEZONE });
        console.log(`🎨 formatIsraelTime: ${utcTime.toISOString()} -> ${formatted} (${formatString})`);
        return formatted;
    }
    catch (error) {
        console.error('❌ formatIsraelTime error:', error);
        throw new Error(`Failed to format Israel time: ${error?.message || error}`);
    }
}
/**
 * בדיקה אם תאריך נתון הוא באזור זמן ישראלי
 * @param date - Date object לבדיקה
 * @returns true אם התאריך תקין
 */
function isValidIsraelDate(date) {
    try {
        if (!(0, date_fns_1.isValid)(date)) {
            return false;
        }
        // בדיקה שהתאריך לא קיצוני
        const year = date.getFullYear();
        if (year < 2020 || year > 2030) {
            console.warn(`⚠️ Suspicious year: ${year}`);
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('❌ isValidIsraelDate error:', error);
        return false;
    }
}
/**
 * בדיקת תקינות טווח זמנים
 * @param startTime - זמן התחלה ב-UTC
 * @param endTime - זמן סיום ב-UTC
 * @returns true אם הטווח תקין
 */
function validateTimeRange(startTime, endTime) {
    try {
        if (!(0, date_fns_1.isValid)(startTime) || !(0, date_fns_1.isValid)(endTime)) {
            console.error('❌ Invalid dates in time range');
            return false;
        }
        if (startTime >= endTime) {
            console.error('❌ Start time must be before end time');
            return false;
        }
        // בדיקה שהטווח לא יותר מ-24 שעות
        const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) {
            console.warn(`⚠️ Time range is ${diffHours} hours (>24h)`);
        }
        console.log(`✅ Valid time range: ${diffHours} hours`);
        return true;
    }
    catch (error) {
        console.error('❌ validateTimeRange error:', error);
        return false;
    }
}
/**
 * קבלת יום השבוע בזמן ישראל
 * @param utcTime - Date object ב-UTC
 * @returns מספר יום השבוע (0=ראשון, 1=שני...)
 */
function getIsraelDayOfWeek(utcTime) {
    try {
        if (!(0, date_fns_1.isValid)(utcTime)) {
            throw new Error(`Invalid UTC date: ${utcTime}`);
        }
        const israelDate = fromUTC(utcTime);
        const dayOfWeek = israelDate.getDay();
        console.log(`📅 getIsraelDayOfWeek: ${utcTime.toISOString()} -> day ${dayOfWeek}`);
        return dayOfWeek;
    }
    catch (error) {
        console.error('❌ getIsraelDayOfWeek error:', error);
        throw error;
    }
}
/**
 * קבלת שעה בזמן ישראל
 * @param utcTime - Date object ב-UTC
 * @returns מספר השעה (0-23)
 */
function getIsraelHour(utcTime) {
    try {
        if (!(0, date_fns_1.isValid)(utcTime)) {
            throw new Error(`Invalid UTC date: ${utcTime}`);
        }
        const israelDate = fromUTC(utcTime);
        const hour = israelDate.getHours();
        console.log(`🕐 getIsraelHour: ${utcTime.toISOString()} -> hour ${hour}`);
        return hour;
    }
    catch (error) {
        console.error('❌ getIsraelHour error:', error);
        throw error;
    }
}
/**
 * יצירת Date object מזמן ישראלי
 * @param year - שנה
 * @param month - חודש (0-11)
 * @param day - יום
 * @param hour - שעה (0-23)
 * @param minute - דקה (0-59)
 * @returns Date object ב-UTC
 */
function createIsraelDate(year, month, day, hour = 0, minute = 0) {
    try {
        // יצירת תאריך בזמן ישראל
        const israelDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        // המרה ל-UTC
        const utcDate = toUTC(israelDateString);
        console.log(`🏗️ createIsraelDate: ${israelDateString} (Israel) -> ${utcDate.toISOString()} (UTC)`);
        return utcDate;
    }
    catch (error) {
        console.error('❌ createIsraelDate error:', error);
        throw new Error(`Failed to create Israel date: ${error?.message || error}`);
    }
}
/**
 * פונקציה לדיבוג - הצגת זמן בשני אזורי זמן
 * @param date - Date object
 * @param label - תווית לזיהוי
 */
function debugTime(date, label = 'Time') {
    try {
        if (!(0, date_fns_1.isValid)(date)) {
            console.log(`🐛 ${label}: INVALID DATE`);
            return;
        }
        const utcString = date.toISOString();
        const israelString = formatIsraelTime(date, 'yyyy-MM-dd HH:mm:ss');
        console.log(`🐛 ${label}:`);
        console.log(`   UTC: ${utcString}`);
        console.log(`   Israel: ${israelString}`);
    }
    catch (error) {
        console.error(`❌ debugTime error for ${label}:`, error);
    }
}
// ייצוא קבועים שימושיים
exports.TIMEZONE_CONSTANTS = {
    ISRAEL_TIMEZONE,
    DAY_NAMES: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    HOUR_BLOCKS: [0, 4, 8, 12, 16, 20] // בלוקי זמן של 4 שעות
};
