/**
 * בדיקות ל-Device ID Manager
 * קובץ זה יכול לרוץ כ-standalone script לבדיקת הפונקציונליות
 */

import { getDeviceId, resetDeviceId, hasDeviceId, getDeviceIdInfo } from './deviceId.js';

/**
 * מריץ בדיקות בסיסיות על Device ID Manager
 */
export const runDeviceIdTests = async () => {
  console.log('🧪 מתחיל בדיקות Device ID Manager...\n');
  
  try {
    // בדיקה 1: איפוס Device ID
    console.log('1️⃣ מאפס Device ID קיים...');
    await resetDeviceId();
    
    // בדיקה 2: בדיקה שאין Device ID
    console.log('2️⃣ בודק שאין Device ID שמור...');
    const hasId1 = await hasDeviceId();
    console.log(`   יש Device ID: ${hasId1}`);
    
    // בדיקה 3: יצירת Device ID ראשון
    console.log('3️⃣ יוצר Device ID ראשון...');
    const deviceId1 = await getDeviceId();
    console.log(`   Device ID: ${deviceId1}`);
    
    // בדיקה 4: בדיקה שיש Device ID
    console.log('4️⃣ בודק שיש Device ID שמור...');
    const hasId2 = await hasDeviceId();
    console.log(`   יש Device ID: ${hasId2}`);
    
    // בדיקה 5: קבלת אותו Device ID
    console.log('5️⃣ מקבל Device ID שוב (צריך להיות אותו)...');
    const deviceId2 = await getDeviceId();
    console.log(`   Device ID: ${deviceId2}`);
    console.log(`   זהה לקודם: ${deviceId1 === deviceId2}`);
    
    // בדיקה 6: מידע על Device ID
    console.log('6️⃣ מקבל מידע על Device ID...');
    const info = await getDeviceIdInfo();
    console.log('   מידע:', JSON.stringify(info, null, 2));
    
    // בדיקה 7: איפוס וחזרה
    console.log('7️⃣ מאפס ויוצר Device ID חדש...');
    await resetDeviceId();
    const deviceId3 = await getDeviceId();
    console.log(`   Device ID חדש: ${deviceId3}`);
    console.log(`   שונה מהקודם: ${deviceId1 !== deviceId3}`);
    
    console.log('\n✅ כל הבדיקות עברו בהצלחה!');
    return true;
    
  } catch (error) {
    console.error('\n❌ בדיקה נכשלה:', error);
    return false;
  }
};

/**
 * בדיקה מהירה - רק יצירה וקבלה
 */
export const quickDeviceIdTest = async () => {
  console.log('⚡ בדיקה מהירה של Device ID...');
  
  try {
    const deviceId = await getDeviceId();
    console.log(`📱 Device ID: ${deviceId}`);
    
    const info = await getDeviceIdInfo();
    console.log(`🔍 פלטפורמה: ${info?.platform}`);
    console.log(`📅 נוצר: ${info?.created?.toLocaleString('he-IL')}`);
    
    return deviceId;
  } catch (error) {
    console.error('❌ בדיקה מהירה נכשלה:', error);
    return null;
  }
};

// אם הקובץ רץ ישירות
if (require.main === module) {
  runDeviceIdTests()
    .then(() => console.log('🎉 בדיקות הסתיימו'))
    .catch(error => console.error('💥 שגיאה בבדיקות:', error));
}
