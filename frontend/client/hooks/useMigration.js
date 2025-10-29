import { useState, useCallback } from 'react';
import migrationService from '../services/migration/migrationService';

/**
 * Hook לניהול העברת נתוני אורח למשתמש רשום
 */
export const useMigration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [preview, setPreview] = useState(null);

  /**
   * קבלת תצוגה מקדימה של הנתונים שיועברו
   */
  const getPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const previewData = await migrationService.getPreview();
      setPreview(previewData);
      
      return previewData;
    } catch (err) {
      console.error('Error getting migration preview:', err);
      setError(err.response?.data?.error || 'Failed to get migration preview');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ביצוע מיזוג מלא של נתוני אורח
   */
  const performMigration = useCallback(async (options = { autoCleanup: true }) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await migrationService.performFullMigration(options);
      setMigrationResult(result);
      
      return result;
    } catch (err) {
      console.error('Error performing migration:', err);
      setError(err.response?.data?.error || 'Migration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * בדיקה האם יש נתונים למיזוג
   */
  const checkHasDataToMigrate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const hasData = await migrationService.hasDataToMigrate();
      return hasData;
    } catch (err) {
      console.error('Error checking migration data:', err);
      setError(err.response?.data?.error || 'Failed to check migration data');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * קבלת סיכום הנתונים הזמינים למיזוג
   */
  const getMigrationSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const summary = await migrationService.getMigrationSummary();
      return summary;
    } catch (err) {
      console.error('Error getting migration summary:', err);
      setError(err.response?.data?.error || 'Failed to get migration summary');
      return {
        hasData: false,
        totalItems: 0,
        breakdown: { favorites: 0, savedPlaces: 0, recentSearches: 0 },
        samples: { favorites: [], savedPlaces: [], recentSearches: [] }
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * איפוס המצב
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setMigrationResult(null);
    setPreview(null);
  }, []);

  return {
    // State
    loading,
    error,
    migrationResult,
    preview,
    
    // Actions
    getPreview,
    performMigration,
    checkHasDataToMigrate,
    getMigrationSummary,
    reset,
    
    // Computed
    hasPreview: !!preview,
    hasMigrationResult: !!migrationResult,
    migrationSuccess: migrationResult?.success || false
  };
};
