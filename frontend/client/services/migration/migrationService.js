import api from '../../utils/api';
import { getDeviceId } from '../../utils/deviceId';

/**
 * שירות העברת נתוני אורח למשתמש רשום
 */
class MigrationService {
  
  /**
   * תצוגה מקדימה של הנתונים שיועברו
   * @returns {Promise<Object>} פרטי הנתונים הזמינים למיזוג
   */
  async getPreview() {
    try {
      // בדיקה שכל הדרוש קיים
      if (!api || typeof api.get !== 'function') {
        console.error('❌ API object not properly initialized');
        return { data: { counts: { total: 0, favorites: 0, savedPlaces: 0, recentSearches: 0 } } };
      }

      const deviceId = await getDeviceId();
      
      if (!deviceId) {
        console.warn('⚠️ No device ID available');
        return { data: { counts: { total: 0, favorites: 0, savedPlaces: 0, recentSearches: 0 } } };
      }

      console.log('🔍 Getting migration preview for deviceId:', deviceId);
      
      const response = await api.get(`/api/migration/preview?deviceId=${encodeURIComponent(deviceId)}`);
      
      if (!response || !response.data) {
        console.warn('⚠️ No data returned from migration preview');
        return { data: { counts: { total: 0, favorites: 0, savedPlaces: 0, recentSearches: 0 } } };
      }
      
      console.log('📋 Migration preview:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting migration preview:', error);
      // Return empty data instead of throwing error
      return { data: { counts: { total: 0, favorites: 0, savedPlaces: 0, recentSearches: 0 } } };
    }
  }

  /**
   * ביצוע העברת נתוני אורח למשתמש רשום
   * @returns {Promise<Object>} תוצאות המיזוג
   */
  async migrateAnonymousData() {
    try {
      const deviceId = await getDeviceId();
      console.log('🔄 Starting migration for deviceId:', deviceId);
      
      const response = await api.post('/api/migration/anonymous-to-user', {
        deviceId
      });
      
      console.log('✅ Migration completed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error during migration:', error);
      throw error;
    }
  }

  /**
   * מחיקת נתוני אורח לאחר מיזוג מוצלח
   * @returns {Promise<Object>} תוצאות הניקוי
   */
  async cleanupAnonymousData() {
    try {
      const deviceId = await getDeviceId();
      console.log('🧹 Starting cleanup for deviceId:', deviceId);
      
      const response = await api.post('/api/migration/cleanup-anonymous', {
        deviceId
      });
      
      console.log('🗑️ Cleanup completed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * ביצוע מיזוג מלא (העברה + ניקוי)
   * @param {Object} options - אפשרויות המיזוג
   * @param {boolean} options.autoCleanup - האם לבצע ניקוי אוטומטי לאחר המיזוג
   * @returns {Promise<Object>} תוצאות המיזוג המלא
   */
  async performFullMigration(options = { autoCleanup: true }) {
    try {
      console.log('🚀 Starting full migration process...');
      
      // שלב 1: תצוגה מקדימה
      const preview = await this.getPreview();
      console.log('📊 Migration preview:', preview);
      
      // אם אין נתונים למיזוג
      if (preview.data.counts.total === 0) {
        console.log('ℹ️ No data to migrate');
        return {
          success: true,
          message: 'No anonymous data found to migrate',
          preview,
          migration: null,
          cleanup: null
        };
      }
      
      // שלב 2: ביצוע המיזוג
      const migration = await this.migrateAnonymousData();
      console.log('✅ Migration result:', migration);
      
      let cleanup = null;
      
      // שלב 3: ניקוי (אם נדרש)
      if (options.autoCleanup) {
        try {
          cleanup = await this.cleanupAnonymousData();
          console.log('🧹 Cleanup result:', cleanup);
        } catch (cleanupError) {
          console.warn('⚠️ Cleanup failed, but migration succeeded:', cleanupError);
          // לא נזרוק שגיאה כי המיזוג הצליח
        }
      }
      
      return {
        success: true,
        message: 'Migration completed successfully',
        preview,
        migration,
        cleanup
      };
      
    } catch (error) {
      console.error('💥 Full migration failed:', error);
      throw error;
    }
  }

  /**
   * בדיקה האם יש נתוני אורח זמינים למיזוג
   * @returns {Promise<boolean>} האם יש נתונים למיזוג
   */
  async hasDataToMigrate() {
    try {
      const preview = await this.getPreview();
      
      // Safe access to counts
      const counts = preview?.data?.counts || { total: 0 };
      return counts.total > 0;
    } catch (error) {
      console.error('❌ Error checking migration data:', error);
      return false;
    }
  }

  /**
   * קבלת סיכום הנתונים הזמינים למיזוג
   * @returns {Promise<Object>} סיכום הנתונים
   */
  async getMigrationSummary() {
    try {
      const preview = await this.getPreview();
      const counts = preview?.data?.counts || { total: 0, favorites: 0, savedPlaces: 0, recentSearches: 0 };
      
      return {
        hasData: counts.total > 0,
        totalItems: counts.total,
        breakdown: {
          favorites: counts.favorites,
          savedPlaces: counts.savedPlaces,
          recentSearches: counts.recentSearches
        },
        samples: preview.data.samples
      };
    } catch (error) {
      console.error('❌ Error getting migration summary:', error);
      return {
        hasData: false,
        totalItems: 0,
        breakdown: {
          favorites: 0,
          savedPlaces: 0,
          recentSearches: 0
        },
        samples: {
          favorites: [],
          savedPlaces: [],
          recentSearches: []
        }
      };
    }
  }
}

export default new MigrationService();
