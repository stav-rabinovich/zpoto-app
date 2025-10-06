/**
 * כלי לזיהוי וניקוי קוד AsyncStorage ישן
 * הקובץ הזה עוזר לזהות ולנקות קוד ישן שמשתמש ב-AsyncStorage ישירות
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * רשימת מפתחות AsyncStorage ישנים שצריך לנקות
 */
const LEGACY_KEYS = [
  'profile',
  'vehicles', 
  'bookings',
  'userProfile',
  'settings',
  'favorites',
  'searchHistory',
  'owner_listings',
  'owner_bookings',
  'parkings',
  'listings'
];

/**
 * רשימת תבניות קוד שצריך להחליף
 */
const LEGACY_PATTERNS = [
  {
    pattern: /AsyncStorage\.getItem\(['"`]([^'"`]+)['"`]\)/g,
    description: 'AsyncStorage.getItem() ישיר',
    replacement: 'השתמש בשירותי API החדשים'
  },
  {
    pattern: /AsyncStorage\.setItem\(['"`]([^'"`]+)['"`],\s*[^)]+\)/g,
    description: 'AsyncStorage.setItem() ישיר',
    replacement: 'השתמש בשירותי API החדשים'
  },
  {
    pattern: /AsyncStorage\.removeItem\(['"`]([^'"`]+)['"`]\)/g,
    description: 'AsyncStorage.removeItem() ישיר',
    replacement: 'השתמש בשירותי API החדשים'
  },
  {
    pattern: /import.*bookingsRepo/g,
    description: 'ייבוא של bookingsRepo ישן',
    replacement: 'השתמש ב-services/api/bookings'
  },
  {
    pattern: /import.*listingsRepo/g,
    description: 'ייבוא של listingsRepo ישן',
    replacement: 'השתמש ב-services/api/owner'
  }
];

/**
 * בדיקת נתוני AsyncStorage ישנים
 * @returns {Promise} רשימת מפתחות ישנים שנמצאו
 */
export const scanLegacyData = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const legacyKeys = allKeys.filter(key => 
      LEGACY_KEYS.includes(key) || 
      key.startsWith('backup_') ||
      key.startsWith('fallback_')
    );

    const legacyData = {};
    for (const key of legacyKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const parsedValue = JSON.parse(value);
          legacyData[key] = {
            size: value.length,
            type: Array.isArray(parsedValue) ? 'array' : typeof parsedValue,
            itemCount: Array.isArray(parsedValue) ? parsedValue.length : 1,
            lastModified: parsedValue.updatedAt || parsedValue.timestamp || 'לא ידוע'
          };
        }
      } catch (error) {
        legacyData[key] = {
          size: value?.length || 0,
          type: 'string',
          itemCount: 1,
          lastModified: 'לא ידוע',
          error: 'לא ניתן לפרסר'
        };
      }
    }

    return {
      success: true,
      data: legacyData,
      totalKeys: legacyKeys.length,
      totalSize: Object.values(legacyData).reduce((sum, item) => sum + item.size, 0)
    };
  } catch (error) {
    console.error('Failed to scan legacy data:', error);
    return {
      success: false,
      error: error.message,
      data: {},
      totalKeys: 0,
      totalSize: 0
    };
  }
};

/**
 * ניקוי נתוני AsyncStorage ישנים
 * @param {Array} keysToClean - מפתחות ספציפיים לניקוי (אופציונלי)
 * @returns {Promise} תוצאת הניקוי
 */
export const cleanLegacyData = async (keysToClean = null) => {
  try {
    const targetKeys = keysToClean || LEGACY_KEYS;
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key => targetKeys.includes(key));

    let removedCount = 0;
    const errors = [];

    for (const key of keysToRemove) {
      try {
        await AsyncStorage.removeItem(key);
        removedCount++;
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      removedCount,
      errors,
      message: `${removedCount} מפתחות נמחקו${errors.length > 0 ? ` (${errors.length} שגיאות)` : ''}`
    };
  } catch (error) {
    console.error('Failed to clean legacy data:', error);
    return {
      success: false,
      error: error.message,
      removedCount: 0,
      errors: []
    };
  }
};

/**
 * יצירת דוח על שימוש ב-AsyncStorage בקוד
 * הפונקציה הזו דורשת גישה למערכת הקבצים ולכן תעבוד רק בסביבת פיתוח
 * @param {string} projectPath - נתיב לפרויקט
 * @returns {Promise} דוח על שימוש ישן
 */
export const generateLegacyUsageReport = async (projectPath = './') => {
  // הערה: הפונקציה הזה תעבוד רק בסביבת Node.js/פיתוח
  // ברגע שהאפליקציה תרוץ על מכשיר, הפונקציה תחזיר הודעת שגיאה מתאימה
  
  if (typeof require === 'undefined') {
    return {
      success: false,
      error: 'הפונקציה זמינה רק בסביבת פיתוח',
      files: [],
      totalIssues: 0
    };
  }

  try {
    const fs = require('fs');
    const path = require('path');
    
    const report = {
      files: [],
      totalIssues: 0,
      patterns: {}
    };

    // סריקה רקורסיבית של קבצי JavaScript/TypeScript
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
          scanFile(filePath);
        }
      }
    };

    const scanFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileIssues = [];

      for (const patternInfo of LEGACY_PATTERNS) {
        const matches = content.match(patternInfo.pattern);
        if (matches) {
          fileIssues.push({
            pattern: patternInfo.description,
            matches: matches.length,
            replacement: patternInfo.replacement
          });

          if (!report.patterns[patternInfo.description]) {
            report.patterns[patternInfo.description] = 0;
          }
          report.patterns[patternInfo.description] += matches.length;
        }
      }

      if (fileIssues.length > 0) {
        report.files.push({
          path: filePath,
          issues: fileIssues,
          totalIssues: fileIssues.reduce((sum, issue) => sum + issue.matches, 0)
        });
        report.totalIssues += fileIssues.reduce((sum, issue) => sum + issue.matches, 0);
      }
    };

    scanDirectory(projectPath);

    return {
      success: true,
      ...report
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      files: [],
      totalIssues: 0
    };
  }
};

/**
 * יצירת תוכנית מיגרציה מותאמת אישית
 * @param {Object} scanResults - תוצאות סריקת הקוד
 * @returns {Object} תוכנית מיגרציה
 */
export const generateMigrationPlan = (scanResults) => {
  const plan = {
    priority: 'high',
    steps: [],
    estimatedTime: 0,
    risks: []
  };

  // הוספת שלבים בהתאם לתוצאות הסריקה
  if (scanResults.patterns['AsyncStorage.getItem() ישיר']) {
    plan.steps.push({
      title: 'החלפת AsyncStorage.getItem()',
      description: 'החלף את כל השימושים ב-AsyncStorage.getItem() בשירותי API החדשים',
      files: scanResults.files.filter(f => 
        f.issues.some(i => i.pattern === 'AsyncStorage.getItem() ישיר')
      ).length,
      estimatedTime: 30 // דקות
    });
    plan.estimatedTime += 30;
  }

  if (scanResults.patterns['AsyncStorage.setItem() ישיר']) {
    plan.steps.push({
      title: 'החלפת AsyncStorage.setItem()',
      description: 'החלף את כל השימושים ב-AsyncStorage.setItem() בשירותי API החדשים',
      files: scanResults.files.filter(f => 
        f.issues.some(i => i.pattern === 'AsyncStorage.setItem() ישיר')
      ).length,
      estimatedTime: 45 // דקות
    });
    plan.estimatedTime += 45;
  }

  // הוספת סיכונים
  if (scanResults.totalIssues > 20) {
    plan.risks.push('מספר גבוה של שימושים ישנים - מומלץ לבצע בשלבים');
    plan.priority = 'critical';
  }

  if (scanResults.files.some(f => f.path.includes('Context'))) {
    plan.risks.push('שימוש ב-AsyncStorage ב-Context - עדכון זה עלול להשפיע על כל האפליקציה');
  }

  return plan;
};

/**
 * בדיקת תאימות לאחר ניקוי
 * @returns {Promise} תוצאות בדיקת התאימות
 */
export const validatePostCleanup = async () => {
  const results = {
    success: true,
    issues: [],
    warnings: []
  };

  try {
    // בדיקה שהשירותים החדשים עובדים
    const { checkLocalData } = await import('../services/migration');
    const { isOnline } = await import('../services/fallback');
    
    try {
      await checkLocalData();
      results.warnings.push('שירות migration עובד תקין');
    } catch (error) {
      results.issues.push('שירות migration לא עובד: ' + error.message);
      results.success = false;
    }

    try {
      await isOnline();
      results.warnings.push('שירות fallback עובד תקין');
    } catch (error) {
      results.issues.push('שירות fallback לא עובד: ' + error.message);
      results.success = false;
    }

    // בדיקה שלא נשארו מפתחות ישנים
    const legacyScan = await scanLegacyData();
    if (legacyScan.success && legacyScan.totalKeys > 0) {
      results.warnings.push(`נמצאו ${legacyScan.totalKeys} מפתחות ישנים שעדיין קיימים`);
    }

  } catch (error) {
    results.issues.push('שגיאה כללית בבדיקת תאימות: ' + error.message);
    results.success = false;
  }

  return results;
};

/**
 * יצירת גיבוי אחרון לפני ניקוי מלא
 * @returns {Promise} תוצאת הגיבוי
 */
export const createFinalBackup = async () => {
  try {
    const timestamp = Date.now();
    const backupKey = `final_backup_${timestamp}`;
    
    const allKeys = await AsyncStorage.getAllKeys();
    const allData = await AsyncStorage.multiGet(allKeys);
    
    const backup = {};
    for (const [key, value] of allData) {
      if (value) {
        backup[key] = value;
      }
    }

    await AsyncStorage.setItem(backupKey, JSON.stringify(backup));

    return {
      success: true,
      backupKey,
      itemCount: Object.keys(backup).length,
      size: JSON.stringify(backup).length,
      message: 'גיבוי אחרון נוצר בהצלחה'
    };
  } catch (error) {
    console.error('Failed to create final backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
