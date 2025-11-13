// config/timeBlocks.ts
// תצורת בלוקי זמן למערכת זמינות בעלי חניות

export interface TimeSlot {
  start: number;
  end: number;
  label: string;
}

export interface TimeBlocksConfig {
  HOURS_PER_BLOCK: number;
  BLOCKS_PER_DAY: number;
  SLOTS: TimeSlot[];
}

export const TIME_BLOCKS_CONFIG = {
  // התצורה הנוכחית (4 שעות לבלוק)
  CURRENT: {
    HOURS_PER_BLOCK: 4,
    BLOCKS_PER_DAY: 6,
    SLOTS: [
      { start: 0, end: 4, label: '00:00-04:00' },
      { start: 4, end: 8, label: '04:00-08:00' },
      { start: 8, end: 12, label: '08:00-12:00' },
      { start: 12, end: 16, label: '12:00-16:00' },
      { start: 16, end: 20, label: '16:00-20:00' },
      { start: 20, end: 24, label: '20:00-24:00' }
    ]
  } as TimeBlocksConfig,

  // התצורה החדשה (3 שעות לבלוק)
  NEW: {
    HOURS_PER_BLOCK: 3,
    BLOCKS_PER_DAY: 8,
    SLOTS: [
      { start: 0, end: 3, label: '00:00-03:00' },
      { start: 3, end: 6, label: '03:00-06:00' },
      { start: 6, end: 9, label: '06:00-09:00' },
      { start: 9, end: 12, label: '09:00-12:00' },
      { start: 12, end: 15, label: '12:00-15:00' },
      { start: 15, end: 18, label: '15:00-18:00' },
      { start: 18, end: 21, label: '18:00-21:00' },
      { start: 21, end: 24, label: '21:00-24:00' }
    ]
  } as TimeBlocksConfig
};

/**
 * חישוב תחילת בלוק לפי שעה - גרסה חדשה (3 שעות)
 */
export function calculateBlockStart3Hour(hour: number): number {
  return Math.floor(hour / 3) * 3; // 0, 3, 6, 9, 12, 15, 18, 21
}

/**
 * חישוב תחילת בלוק לפי שעה - גרסה ישנה (4 שעות)
 */
export function calculateBlockStart4Hour(hour: number): number {
  return Math.floor(hour / 4) * 4; // 0, 4, 8, 12, 16, 20
}

/**
 * בדיקה אם בלוק זמן הוא בפורמט של 4 שעות
 */
export function is4HourFormat(availabilityData: any): boolean {
  if (!availabilityData || typeof availabilityData !== 'object') {
    return false;
  }

  // בדוק אם יש בלוקים שמתחילים ב-4, 8, 16, 20 (ייחודיים לפורמט 4 שעות)
  return Object.values(availabilityData).some((daySlots: any) => 
    Array.isArray(daySlots) && daySlots.some(slot => [4, 8, 16, 20].includes(slot))
  );
}

/**
 * בדיקה אם בלוק זמן הוא בפורמט של 3 שעות
 */
export function is3HourFormat(availabilityData: any): boolean {
  if (!availabilityData || typeof availabilityData !== 'object') {
    return false;
  }

  // בדוק אם יש בלוקים שמתחילים ב-3, 6, 9, 15, 18, 21 (ייחודיים לפורמט 3 שעות)
  return Object.values(availabilityData).some((daySlots: any) => 
    Array.isArray(daySlots) && daySlots.some(slot => [3, 6, 9, 15, 18, 21].includes(slot))
  );
}

/**
 * קבלת התצורה הנוכחית (3 שעות או 4 שעות) לפי נתוני זמינות
 */
export function getCurrentTimeBlocksConfig(availabilityData: any): TimeBlocksConfig {
  if (is3HourFormat(availabilityData)) {
    return TIME_BLOCKS_CONFIG.NEW;
  }
  return TIME_BLOCKS_CONFIG.CURRENT;
}
