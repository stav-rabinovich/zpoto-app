/**
 * בדיקות רגרסיה למיגרציה מ-AsyncStorage לשרת
 * הקובץ הזה מכיל בדיקות אוטומטיות לוידוא שהמיגרציה עובדת כמו שצריך
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  checkLocalData, 
  migrateAllData, 
  backupLocalData, 
  cleanupLocalData,
  validateDataIntegrity 
} from '../services/migration';
import { 
  isOnline, 
  savePendingAction, 
  executePendingActions,
  cacheData,
  getCachedItem,
  getFallbackStats
} from '../services/fallback';
import { apiWithFallback } from '../services/api-with-fallback';

/**
 * בדיקות בסיסיות למיגרציה
 */
export const runMigrationTests = async () => {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const addTest = (name, passed, error = null) => {
    results.tests.push({ name, passed, error });
    if (passed) results.passed++;
    else results.failed++;
  };

  console.log('🧪 מתחיל בדיקות רגרסיה למיגרציה...');

  try {
    // בדיקה 1: בדיקת נתונים מקומיים
    console.log('📋 בדיקה 1: בדיקת נתונים מקומיים');
    try {
      const localData = await checkLocalData();
      addTest('checkLocalData', typeof localData === 'object' && localData.hasOwnProperty('hasData'));
    } catch (error) {
      addTest('checkLocalData', false, error.message);
    }

    // בדיקה 2: ולידציית נתונים
    console.log('✅ בדיקה 2: ולידציית נתונים');
    try {
      const validation = await validateDataIntegrity();
      addTest('validateDataIntegrity', validation.success);
    } catch (error) {
      addTest('validateDataIntegrity', false, error.message);
    }

    // בדיקה 3: יצירת גיבוי
    console.log('💾 בדיקה 3: יצירת גיבוי');
    try {
      const backup = await backupLocalData();
      addTest('backupLocalData', backup.success);
    } catch (error) {
      addTest('backupLocalData', false, error.message);
    }

    // בדיקה 4: בדיקת חיבור
    console.log('🌐 בדיקה 4: בדיקת חיבור');
    try {
      const online = await isOnline();
      addTest('isOnline', typeof online === 'boolean');
    } catch (error) {
      addTest('isOnline', false, error.message);
    }

    // בדיקה 5: שמירת פעולה ממתינה
    console.log('⏳ בדיקה 5: שמירת פעולה ממתינה');
    try {
      const testAction = {
        type: 'test',
        endpoint: '/test',
        method: 'POST',
        data: { test: true }
      };
      const result = await savePendingAction(testAction);
      addTest('savePendingAction', result.success);
    } catch (error) {
      addTest('savePendingAction', false, error.message);
    }

    // בדיקה 6: מטמון
    console.log('🗄️ בדיקה 6: מטמון');
    try {
      const testData = { test: 'data', timestamp: Date.now() };
      const cacheResult = await cacheData('test_key', testData, 60000);
      const retrievedData = await getCachedItem('test_key');
      
      const cacheWorking = cacheResult.success && 
                          retrievedData && 
                          retrievedData.test === testData.test;
      
      addTest('cacheData', cacheWorking);
    } catch (error) {
      addTest('cacheData', false, error.message);
    }

    // בדיקה 7: API עם fallback
    console.log('🔄 בדיקה 7: API עם fallback');
    try {
      // בדיקה עם endpoint שלא קיים (צריך לחזור עם שגיאה מובנת)
      const result = await apiWithFallback('/test/nonexistent', {
        method: 'GET',
        cacheKey: 'test_cache'
      });
      
      // הבדיקה עוברת אם יש תוצאה (גם אם שגיאה)
      addTest('apiWithFallback', typeof result === 'object' && result.hasOwnProperty('success'));
    } catch (error) {
      addTest('apiWithFallback', false, error.message);
    }

    // בדיקה 8: סטטיסטיקות fallback
    console.log('📊 בדיקה 8: סטטיסטיקות fallback');
    try {
      const stats = await getFallbackStats();
      addTest('getFallbackStats', stats.success && typeof stats.data === 'object');
    } catch (error) {
      addTest('getFallbackStats', false, error.message);
    }

  } catch (error) {
    console.error('❌ שגיאה כללית בבדיקות:', error);
  }

  // סיכום תוצאות
  console.log('\n📋 סיכום בדיקות רגרסיה:');
  console.log(`✅ עברו: ${results.passed}`);
  console.log(`❌ נכשלו: ${results.failed}`);
  console.log(`📊 סה"כ: ${results.tests.length}`);
  
  if (results.failed > 0) {
    console.log('\n❌ בדיקות שנכשלו:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'לא ידוע'}`);
      });
  }

  return results;
};

/**
 * בדיקות ביצועים
 */
export const runPerformanceTests = async () => {
  console.log('⚡ מתחיל בדיקות ביצועים...');
  
  const results = {
    cacheSpeed: null,
    migrationSpeed: null,
    apiSpeed: null
  };

  try {
    // בדיקת מהירות מטמון
    const cacheStart = Date.now();
    const testData = { large: 'data'.repeat(1000) };
    await cacheData('perf_test', testData);
    await getCachedItem('perf_test');
    results.cacheSpeed = Date.now() - cacheStart;

    // בדיקת מהירות API
    const apiStart = Date.now();
    await apiWithFallback('/test', { method: 'GET' });
    results.apiSpeed = Date.now() - apiStart;

    console.log('⚡ תוצאות ביצועים:');
    console.log(`  - מטמון: ${results.cacheSpeed}ms`);
    console.log(`  - API: ${results.apiSpeed}ms`);

  } catch (error) {
    console.error('❌ שגיאה בבדיקות ביצועים:', error);
  }

  return results;
};

/**
 * בדיקות אינטגרציה
 */
export const runIntegrationTests = async () => {
  console.log('🔗 מתחיל בדיקות אינטגרציה...');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const addTest = (name, passed, error = null) => {
    results.tests.push({ name, passed, error });
    if (passed) results.passed++;
    else results.failed++;
  };

  try {
    // בדיקה: זרימה מלאה של מיגרציה (סימולציה)
    console.log('🔄 בדיקת זרימה מלאה');
    
    // 1. יצירת נתונים מדומים
    const mockData = {
      bookings: [{ id: 1, startTime: new Date().toISOString(), endTime: new Date().toISOString() }],
      vehicles: [{ id: 1, licensePlate: '123-45-678' }],
      profile: { name: 'Test User', email: 'test@example.com' }
    };

    // הוסרה שמירה מקומית - עובדים רק עם שרת
    // await AsyncStorage.setItem('bookings', JSON.stringify(mockData.bookings));
    // await AsyncStorage.setItem('vehicles', JSON.stringify(mockData.vehicles));
    // await AsyncStorage.setItem('userProfile', JSON.stringify(mockData.profile));

    // 2. בדיקת זיהוי נתונים
    const localData = await checkLocalData();
    addTest('detectMockData', localData.hasData);

    // 3. ולידציה
    const validation = await validateDataIntegrity();
    addTest('validateMockData', validation.success);

    // 4. גיבוי
    const backup = await backupLocalData();
    addTest('backupMockData', backup.success);

    // 5. ניקוי נתונים מדומים
    await cleanupLocalData(['bookings', 'vehicles', 'userProfile']);
    
    console.log('✅ בדיקת אינטגרציה הושלמה');

  } catch (error) {
    console.error('❌ שגיאה בבדיקות אינטגרציה:', error);
    addTest('integrationFlow', false, error.message);
  }

  return results;
};

/**
 * הרצת כל הבדיקות
 */
export const runAllTests = async () => {
  console.log('🚀 מתחיל הרצת כל בדיקות הרגרסיה...\n');
  
  const startTime = Date.now();
  
  const migrationResults = await runMigrationTests();
  const performanceResults = await runPerformanceTests();
  const integrationResults = await runIntegrationTests();
  
  const totalTime = Date.now() - startTime;
  
  const summary = {
    migration: migrationResults,
    performance: performanceResults,
    integration: integrationResults,
    totalTime,
    overallPassed: migrationResults.failed === 0 && integrationResults.failed === 0
  };

  console.log('\n🏁 סיכום כללי:');
  console.log(`⏱️ זמן כולל: ${totalTime}ms`);
  console.log(`📊 בדיקות מיגרציה: ${migrationResults.passed}/${migrationResults.tests.length}`);
  console.log(`🔗 בדיקות אינטגרציה: ${integrationResults.passed}/${integrationResults.tests.length}`);
  console.log(`${summary.overallPassed ? '✅' : '❌'} סטטוס כללי: ${summary.overallPassed ? 'עבר' : 'נכשל'}`);

  return summary;
};

/**
 * בדיקה מהירה לפיתוח
 */
export const quickTest = async () => {
  console.log('⚡ בדיקה מהירה...');
  
  try {
    const localData = await checkLocalData();
    const online = await isOnline();
    const stats = await getFallbackStats();
    
    console.log('✅ בדיקה מהירה הושלמה:');
    console.log(`  - נתונים מקומיים: ${localData.hasData ? 'יש' : 'אין'}`);
    console.log(`  - חיבור: ${online ? 'מחובר' : 'לא מחובר'}`);
    console.log(`  - פעולות ממתינות: ${stats.success ? stats.data.pendingActionsCount : 'לא ידוע'}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ בדיקה מהירה נכשלה:', error);
    return { success: false, error: error.message };
  }
};
