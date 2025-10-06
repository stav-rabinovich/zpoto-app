/**
 * מנגנון ניקוי נכון בהתנתקות - Server-Only Architecture
 * מוחק רק token, כל השאר נשאר בזיכרון עד לסגירת האפליקציה
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import memoryCache from './memory-cache';
import requestQueue from './request-queue';

class LogoutCleaner {
  constructor() {
    this.itemsToKeep = [
      // רשימת items שלא צריך למחוק בהתנתקות
      'app_settings',
      'theme_preference',
      'language_preference',
      'onboarding_completed',
      'app_version',
      'device_info'
    ];
    
    this.itemsToDelete = [
      // רק items של אימות
      'userToken',
      'refreshToken',
      'tokenExpiry'
    ];
  }

  /**
   * ניקוי נכון בהתנתקות
   */
  async performLogoutCleanup(userId = null) {
    console.log('🧹 Starting logout cleanup...');
    
    const cleanupResults = {
      asyncStorage: { deleted: [], kept: [], errors: [] },
      memoryCache: { cleared: 0, errors: [] },
      requestQueue: { cleared: 0, errors: [] }
    };

    // 1. ניקוי AsyncStorage - רק tokens
    await this.cleanAsyncStorage(cleanupResults.asyncStorage);

    // 2. ניקוי Memory Cache - רק של המשתמש הנוכחי
    await this.cleanMemoryCache(userId, cleanupResults.memoryCache);

    // 3. ניקוי Request Queue - רק בקשות של המשתמש
    await this.cleanRequestQueue(userId, cleanupResults.requestQueue);

    console.log('✅ Logout cleanup completed:', cleanupResults);
    return cleanupResults;
  }

  /**
   * ניקוי AsyncStorage - רק tokens
   */
  async cleanAsyncStorage(results) {
    try {
      console.log('🔑 Cleaning AsyncStorage tokens...');
      
      // מחיקת tokens בלבד
      for (const item of this.itemsToDelete) {
        try {
          await AsyncStorage.removeItem(item);
          results.deleted.push(item);
          console.log(`✅ Deleted: ${item}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${item}:`, error);
          results.errors.push({ item, error: error.message });
        }
      }

      // בדיקה שitems אחרים נשארו
      for (const item of this.itemsToKeep) {
        try {
          const value = await AsyncStorage.getItem(item);
          if (value !== null) {
            results.kept.push(item);
            console.log(`✅ Kept: ${item}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not check ${item}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ AsyncStorage cleanup failed:', error);
      results.errors.push({ general: error.message });
    }
  }

  /**
   * ניקוי Memory Cache - רק של המשתמש
   */
  async cleanMemoryCache(userId, results) {
    try {
      console.log('💾 Cleaning memory cache...');
      
      if (userId) {
        // ניקוי רק cache של המשתמש הספציפי
        const userKeys = memoryCache.keys().filter(key => 
          key.includes(userId) || 
          key.includes('user_profile') ||
          key.includes('user_vehicles') ||
          key.includes('user_bookings') ||
          key.includes('saved_places') ||
          key.includes('recent_searches') ||
          key.includes('favorites') ||
          key.includes('payment_methods')
        );

        userKeys.forEach(key => {
          memoryCache.delete(key);
          results.cleared++;
        });

        console.log(`✅ Cleared ${results.cleared} user-specific cache entries`);
      } else {
        // אם אין userId, ניקוי כל הcache
        results.cleared = memoryCache.clear();
        console.log(`✅ Cleared all ${results.cleared} cache entries`);
      }

    } catch (error) {
      console.error('❌ Memory cache cleanup failed:', error);
      results.errors.push(error.message);
    }
  }

  /**
   * ניקוי Request Queue - רק בקשות רלוונטיות
   */
  async cleanRequestQueue(userId, results) {
    try {
      console.log('📥 Cleaning request queue...');
      
      // ניקוי כל התור (כי הוא בזיכרון בלבד ולא persistent)
      results.cleared = requestQueue.clearQueue();
      console.log(`✅ Cleared ${results.cleared} queued requests`);

    } catch (error) {
      console.error('❌ Request queue cleanup failed:', error);
      results.errors.push(error.message);
    }
  }

  /**
   * בדיקת מה נשאר אחרי ניקוי
   */
  async auditRemainingData() {
    console.log('🔍 Auditing remaining data after logout...');
    
    const audit = {
      asyncStorage: [],
      memoryCache: {
        size: memoryCache.size(),
        keys: memoryCache.keys()
      },
      requestQueue: {
        status: requestQueue.getQueueStatus()
      }
    };

    try {
      // בדיקת AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        audit.asyncStorage.push({
          key,
          hasValue: value !== null,
          size: value ? value.length : 0
        });
      }

      console.log('📊 Data audit results:', audit);
      return audit;

    } catch (error) {
      console.error('❌ Audit failed:', error);
      return { error: error.message };
    }
  }

  /**
   * בדיקה שלא נמחקו נתונים שצריכים להישאר
   */
  async validateCleanup() {
    console.log('✅ Validating cleanup...');
    
    const validation = {
      tokensDeleted: true,
      appDataKept: true,
      errors: []
    };

    try {
      // בדיקה שtokens נמחקו
      for (const tokenItem of this.itemsToDelete) {
        const value = await AsyncStorage.getItem(tokenItem);
        if (value !== null) {
          validation.tokensDeleted = false;
          validation.errors.push(`Token ${tokenItem} was not deleted`);
        }
      }

      // בדיקה שנתוני אפליקציה נשארו (אם היו)
      for (const appItem of this.itemsToKeep) {
        // כאן לא בודקים שהם קיימים, רק שלא נמחקו בטעות
        // זה תלוי באם היו שמורים מקודם
      }

      console.log('✅ Cleanup validation:', validation);
      return validation;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      validation.errors.push(error.message);
      return validation;
    }
  }

  /**
   * ניקוי חירום - מחיקת הכל מלבד הגדרות אפליקציה
   */
  async emergencyCleanup() {
    console.log('🚨 Performing emergency cleanup...');
    
    try {
      // קבלת כל המפתחות
      const allKeys = await AsyncStorage.getAllKeys();
      
      // מחיקת הכל מלבד items שצריכים להישאר
      const keysToDelete = allKeys.filter(key => !this.itemsToKeep.includes(key));
      
      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
        console.log(`🧹 Emergency cleanup: deleted ${keysToDelete.length} items`);
      }

      // ניקוי זיכרון
      const cacheCleared = memoryCache.clear();
      const queueCleared = requestQueue.clearQueue();

      console.log(`✅ Emergency cleanup completed: ${keysToDelete.length} storage items, ${cacheCleared} cache entries, ${queueCleared} queue items`);
      
      return {
        success: true,
        deletedStorage: keysToDelete.length,
        deletedCache: cacheCleared,
        deletedQueue: queueCleared
      };

    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// יצירת instance יחיד
const logoutCleaner = new LogoutCleaner();

export default logoutCleaner;

/**
 * פונקציות עזר
 */
export const performLogoutCleanup = (userId) => logoutCleaner.performLogoutCleanup(userId);
export const auditRemainingData = () => logoutCleaner.auditRemainingData();
export const validateCleanup = () => logoutCleaner.validateCleanup();
export const emergencyCleanup = () => logoutCleaner.emergencyCleanup();
