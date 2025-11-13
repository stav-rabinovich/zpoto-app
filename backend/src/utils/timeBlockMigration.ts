// utils/timeBlockMigration.ts
// פונקציות עזר להמרת בלוקי זמן מ-4 שעות ל-3 שעות

import { TIME_BLOCKS_CONFIG, is4HourFormat, is3HourFormat } from '../config/timeBlocks';

export interface AvailabilityData {
  [dayKey: string]: number[]; // sunday: [0,3,6], monday: [9,12,15], etc.
}

/**
 * המרת זמינות מבלוקי 4 שעות לבלוקי 3 שעות
 * 
 * לוגיקת המיגרציה:
 * - כל בלוק של 4 שעות מתחלק לבלוקים של 3 שעות עם חפיפה
 * - מטרה: לשמור על זמינות מקסימלית ולא לאבד זמנים זמינים
 * 
 * @param old4HourAvailability - נתוני זמינות בפורמט 4 שעות
 * @returns נתוני זמינות בפורמט 3 שעות
 */
export function migrate4HourBlocksTo3Hour(old4HourAvailability: AvailabilityData): AvailabilityData {
  console.log('🔄 Starting migration from 4-hour blocks to 3-hour blocks');
  console.log('📋 Input data:', old4HourAvailability);

  const migrated: AvailabilityData = {};
  
  // מיפוי המרה מבלוקי 4 שעות לבלוקי 3 שעות
  const migrationMapping: { [key: number]: number[] } = {
    0:  [0, 3],      // 00:00-04:00 -> 00:00-03:00 + 03:00-06:00
    4:  [3, 6],      // 04:00-08:00 -> 03:00-06:00 + 06:00-09:00  
    8:  [6, 9],      // 08:00-12:00 -> 06:00-09:00 + 09:00-12:00
    12: [12, 15],    // 12:00-16:00 -> 12:00-15:00 + 15:00-18:00
    16: [15, 18],    // 16:00-20:00 -> 15:00-18:00 + 18:00-21:00
    20: [18, 21]     // 20:00-24:00 -> 18:00-21:00 + 21:00-24:00
  };
  
  Object.keys(old4HourAvailability).forEach(dayKey => {
    const old4HourSlots = old4HourAvailability[dayKey] || [];
    const new3HourSlots: number[] = [];
    
    console.log(`🔄 Migrating ${dayKey}: [${old4HourSlots.join(',')}]`);
    
    // המר כל בלוק של 4 שעות לבלוקים של 3 שעות
    old4HourSlots.forEach(slot4h => {
      const mapped3hSlots = migrationMapping[slot4h];
      if (mapped3hSlots) {
        new3HourSlots.push(...mapped3hSlots);
        console.log(`  📍 ${slot4h} -> [${mapped3hSlots.join(',')}]`);
      } else {
        console.warn(`⚠️  Unknown 4-hour slot: ${slot4h} for day ${dayKey}`);
      }
    });
    
    // הסר כפילויות ומיין
    migrated[dayKey] = [...new Set(new3HourSlots)].sort((a, b) => a - b);
    console.log(`✅ ${dayKey} result: [${migrated[dayKey].join(',')}]`);
  });
  
  console.log('✅ Migration completed');
  console.log('📋 Output data:', migrated);
  
  return migrated;
}

/**
 * המרה הפוכה: מבלוקי 3 שעות לבלוקי 4 שעות (לצורך rollback)
 * 
 * @param new3HourAvailability - נתוני זמינות בפורמט 3 שעות
 * @returns נתוני זמינות בפורמט 4 שעות
 */
export function migrate3HourBlocksTo4Hour(new3HourAvailability: AvailabilityData): AvailabilityData {
  console.log('🔄 Starting rollback migration from 3-hour blocks to 4-hour blocks');
  console.log('📋 Input data:', new3HourAvailability);

  const migrated: AvailabilityData = {};
  
  // מיפוי המרה מבלוקי 3 שעות לבלוקי 4 שעות
  const rollbackMapping: { [key: number]: number } = {
    0: 0,    // 00:00-03:00 -> 00:00-04:00
    3: 4,    // 03:00-06:00 -> 04:00-08:00 (או 00:00-04:00)
    6: 8,    // 06:00-09:00 -> 08:00-12:00 (או 04:00-08:00)
    9: 8,    // 09:00-12:00 -> 08:00-12:00
    12: 12,  // 12:00-15:00 -> 12:00-16:00
    15: 16,  // 15:00-18:00 -> 16:00-20:00 (או 12:00-16:00)
    18: 20,  // 18:00-21:00 -> 20:00-24:00 (או 16:00-20:00)
    21: 20   // 21:00-24:00 -> 20:00-24:00
  };
  
  Object.keys(new3HourAvailability).forEach(dayKey => {
    const new3HourSlots = new3HourAvailability[dayKey] || [];
    const old4HourSlots: number[] = [];
    
    console.log(`🔄 Rolling back ${dayKey}: [${new3HourSlots.join(',')}]`);
    
    // המר כל בלוק של 3 שעות לבלוק של 4 שעות
    new3HourSlots.forEach(slot3h => {
      const mapped4hSlot = rollbackMapping[slot3h];
      if (mapped4hSlot !== undefined) {
        old4HourSlots.push(mapped4hSlot);
        console.log(`  📍 ${slot3h} -> ${mapped4hSlot}`);
      } else {
        console.warn(`⚠️  Unknown 3-hour slot: ${slot3h} for day ${dayKey}`);
      }
    });
    
    // הסר כפילויות ומיין
    migrated[dayKey] = [...new Set(old4HourSlots)].sort((a, b) => a - b);
    console.log(`✅ ${dayKey} rollback result: [${migrated[dayKey].join(',')}]`);
  });
  
  console.log('✅ Rollback migration completed');
  console.log('📋 Output data:', migrated);
  
  return migrated;
}

/**
 * וולידציה של נתוני זמינות
 * 
 * @param availabilityData - נתוני זמינות לבדיקה
 * @returns אובייקט עם תוצאות הוולידציה
 */
export function validateAvailabilityData(availabilityData: any): {
  isValid: boolean;
  format: '3hour' | '4hour' | 'unknown';
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!availabilityData || typeof availabilityData !== 'object') {
    errors.push('Invalid availability data structure');
    return { isValid: false, format: 'unknown', errors };
  }
  
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let format: '3hour' | '4hour' | 'unknown' = 'unknown';
  
  // זיהוי פורמט
  if (is4HourFormat(availabilityData)) {
    format = '4hour';
  } else if (is3HourFormat(availabilityData)) {
    format = '3hour';
  }
  
  // בדיקת מבנה נתונים
  Object.keys(availabilityData).forEach(dayKey => {
    if (!dayKeys.includes(dayKey)) {
      errors.push(`Invalid day key: ${dayKey}`);
    }
    
    const daySlots = availabilityData[dayKey];
    if (!Array.isArray(daySlots)) {
      errors.push(`Day ${dayKey} slots must be an array`);
      return;
    }
    
    // בדיקת תקינות הבלוקים
    daySlots.forEach(slot => {
      if (typeof slot !== 'number') {
        errors.push(`Invalid slot type in ${dayKey}: ${slot}`);
        return;
      }
      
      if (format === '4hour') {
        if (![0, 4, 8, 12, 16, 20].includes(slot)) {
          errors.push(`Invalid 4-hour slot in ${dayKey}: ${slot}`);
        }
      } else if (format === '3hour') {
        if (![0, 3, 6, 9, 12, 15, 18, 21].includes(slot)) {
          errors.push(`Invalid 3-hour slot in ${dayKey}: ${slot}`);
        }
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    format,
    errors
  };
}

/**
 * יצירת נתוני זמינות ריקים בפורמט 3 שעות
 */
export function createEmpty3HourAvailability(): AvailabilityData {
  return {
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: []
  };
}

/**
 * יצירת נתוני זמינות מלאים (24/7) בפורמט 3 שעות
 */
export function createFull3HourAvailability(): AvailabilityData {
  const allSlots = [0, 3, 6, 9, 12, 15, 18, 21];
  return {
    sunday: [...allSlots],
    monday: [...allSlots],
    tuesday: [...allSlots],
    wednesday: [...allSlots],
    thursday: [...allSlots],
    friday: [...allSlots],
    saturday: [...allSlots]
  };
}
