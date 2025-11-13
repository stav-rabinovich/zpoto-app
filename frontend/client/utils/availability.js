// utils/availability.js
// מודל זמינות בסיסי + בדיקה אם טווח זמן זמין לפי שבוע
// 🔧 תוקן: משתמש במערכת השעות החדשה

import { getIsraelHourFromDate, getIsraelMinutesFromDate, setTimeInIsrael } from './timezone';

export const HEB_DAYS = [
  { key: 'sun', label: 'א׳' },
  { key: 'mon', label: 'ב׳' },
  { key: 'tue', label: 'ג׳' },
  { key: 'wed', label: 'ד׳' },
  { key: 'thu', label: 'ה׳' },
  { key: 'fri', label: 'ו׳' },
  { key: 'sat', label: 'ש׳' },
];

// בלוקי זמן של 3 שעות - מבנה חדש
export const TIME_BLOCKS = [
  { key: 'block1', label: '00:00-03:00', from: '00:00', to: '03:00' },
  { key: 'block2', label: '03:00-06:00', from: '03:00', to: '06:00' },
  { key: 'block3', label: '06:00-09:00', from: '06:00', to: '09:00' },
  { key: 'block4', label: '09:00-12:00', from: '09:00', to: '12:00' },
  { key: 'block5', label: '12:00-15:00', from: '12:00', to: '15:00' },
  { key: 'block6', label: '15:00-18:00', from: '15:00', to: '18:00' },
  { key: 'block7', label: '18:00-21:00', from: '18:00', to: '21:00' },
  { key: 'block8', label: '21:00-24:00', from: '21:00', to: '24:00' },
];

export function defaultAlwaysAvailable() {
  return {
    mode: 'always', // 'always' | 'weekly'
    weekly: HEB_DAYS.reduce((acc, d) => {
      acc[d.key] = { enabled: true, from: '00:00', to: '23:59' };
      return acc;
    }, {}),
  };
}

// הסרה של פריסט ימי חול 08:00–20:00 – כבר לא בשימוש
export function defaultWeekdayPreset() {
  return defaultAlwaysAvailable();
}

const pad2 = (n) => String(n).padStart(2, '0');

export function isValidHHmm(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function minutesOfDay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function keyForDow(d) {
  // d: Date (local)
  const dow = d.getDay(); // 0=Sun
  return ['sun','mon','tue','wed','thu','fri','sat'][dow];
}

function cloneDate(d) {
  return new Date(d.getTime());
}

// האם טווח מסוים ביום נתון מכוסה ע"י חלון ה-Weekly של אותו יום
function isDayWindowCovered(weekly, date, startMin, endMin) {
  const key = keyForDow(date);
  const rule = weekly[key];
  if (!rule || !rule.enabled) return false;

  const open = minutesOfDay(rule.from);
  const close = minutesOfDay(rule.to);

  // טווח סגור (start<=x<end). אם close<open נחשב כ-24/7 בפשטות
  if (close < open) return true;

  return startMin >= open && endMin <= close;
}

// בודק אם זמינות מכסה את כל הטווח [start,end)
export function isAvailableForRange(availability, startISO, endISO) {
  if (!availability || availability.mode === 'always') return true;
  if (!startISO || !endISO) return true;

  const start = new Date(startISO);
  const end   = new Date(endISO);
  if (!(start < end)) return false;

  // נבדוק יום-יום. כל מקטע ביום חייב להיות מכוסה.
  let dayStart = new Date(start);
  while (dayStart < end) {
    const nextDay = new Date(dayStart);
    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
    const nextDayEnd = setTimeInIsrael(nextDay, 23, 59);
    nextDay = nextDayEnd;
    const segmentEnd = end < nextDay ? end : nextDay;

    // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
    const segStartMin = getIsraelHourFromDate(dayStart) * 60 + getIsraelMinutesFromDate(dayStart);
    const segEndMin = getIsraelHourFromDate(segmentEnd) * 60 + getIsraelMinutesFromDate(segmentEnd) + 1; // לכלול את הדקה האחרונה
    if (!isDayWindowCovered(availability.weekly, dayStart, segStartMin, segEndMin)) {
      return false;
    }

    // מעבר ליום הבא 00:00
    // 🔧 תוקן: משתמש בחישוב מילישניות במקום המרות ידניות
    const nextDayStart = new Date(dayStart.getTime() + (24 * 60 * 60 * 1000));
    dayStart = setTimeInIsrael(nextDayStart, 0, 0);
  }
  return true;
}

// כלי נוח לעדכון כל הימים יחד
export function setAllDays(availability, enabled, from='00:00', to='23:59') {
  const next = { ...availability, mode: 'weekly', weekly: { ...availability.weekly } };
  HEB_DAYS.forEach(d => {
    next.weekly[d.key] = { enabled, from, to };
  });
  return next;
}

// === פונקציות חדשות לעבודה עם בלוקי זמן ===

// מחזיר את כל הבלוקים הפעילים עבור יום מסוים
export function getActiveBlocksForDay(availability, dayKey) {
  if (!availability || availability.mode === 'always') {
    return TIME_BLOCKS.map(block => block.key); // כל הבלוקים פעילים
  }
  
  if (!availability.weekly || !availability.weekly[dayKey]) {
    return []; // אין בלוקים פעילים
  }
  
  const dayRule = availability.weekly[dayKey];
  if (!dayRule.enabled) {
    return []; // היום כבוי
  }
  
  // אם השימוש הוא בפורמט הישן (from/to), נמיר לבלוקים
  if (dayRule.from && dayRule.to) {
    return convertTimeRangeToBlocks(dayRule.from, dayRule.to);
  }
  
  // אם השימוש הוא בפורמט החדש (blocks), נחזיר אותו
  return dayRule.blocks || [];
}

// ממיר טווח שעות (HH:mm - HH:mm) לבלוקי זמן
export function convertTimeRangeToBlocks(from, to) {
  const fromMinutes = minutesOfDay(from);
  const toMinutes = minutesOfDay(to);
  
  return TIME_BLOCKS.filter(block => {
    const blockStart = minutesOfDay(block.from);
    const blockEnd = minutesOfDay(block.to === '24:00' ? '23:59' : block.to);
    
    // בלוק נכלל אם יש חפיפה עם הטווח המבוקש
    return blockStart < toMinutes && blockEnd > fromMinutes;
  }).map(block => block.key);
}

// מעדכן זמינות יום בפורמט בלוקים חדש
export function setDayBlocks(availability, dayKey, blockKeys) {
  const next = { 
    ...availability, 
    mode: 'weekly', 
    weekly: { ...availability.weekly } 
  };
  
  next.weekly[dayKey] = {
    enabled: blockKeys.length > 0,
    blocks: [...blockKeys]
  };
  
  return next;
}

// ממיר מבנה ישן (from/to) למבנה חדש (blocks)
export function migrateToBlockFormat(availability) {
  if (!availability || availability.mode === 'always') {
    return availability;
  }
  
  const migrated = { 
    ...availability, 
    weekly: { ...availability.weekly } 
  };
  
  HEB_DAYS.forEach(day => {
    const dayRule = migrated.weekly[day.key];
    if (dayRule && dayRule.from && dayRule.to && !dayRule.blocks) {
      // מיגרציה מפורמט ישן לחדש
      migrated.weekly[day.key] = {
        enabled: dayRule.enabled,
        blocks: dayRule.enabled ? convertTimeRangeToBlocks(dayRule.from, dayRule.to) : []
      };
    }
  });
  
  return migrated;
}

// בודק אם בלוק זמן מסוים זמין ביום נתון
export function isBlockAvailable(availability, dayKey, blockKey) {
  const activeBlocks = getActiveBlocksForDay(availability, dayKey);
  return activeBlocks.includes(blockKey);
}
