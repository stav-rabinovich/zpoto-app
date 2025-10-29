import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useMigration } from './useMigration';
import postLoginNavigationHandler from '../services/navigation/postLoginNavigationHandler';

/**
 * Hook לניהול ניווט לאחר התחברות
 * מטפל בכל התהליך: מיזוג נתונים, ניווט מיועד, ותרחישים מיוחדים
 */
export const usePostLoginNavigation = () => {
  const navigation = useNavigation();
  const navigationContext = useNavigationContext();
  const migrationHook = useMigration();

  /**
   * אתחול ה-handler עם הcontexts הנדרשים
   */
  const initializeHandler = useCallback(() => {
    postLoginNavigationHandler.initialize(navigationContext, migrationHook);
  }, [navigationContext, migrationHook]);

  /**
   * ביצוע התהליך המלא לאחר התחברות
   */
  const handlePostLogin = useCallback(async (loginResult, options = {}) => {
    // וידוא שה-handler מאותחל
    initializeHandler();
    
    // ביצוע התהליך
    return await postLoginNavigationHandler.handlePostLogin(navigation, loginResult, options);
  }, [navigation, initializeHandler]);

  /**
   * טיפול בתרחישים מיוחדים
   */
  const handleSpecialScenario = useCallback(async (scenario, data = {}) => {
    initializeHandler();
    return await postLoginNavigationHandler.handleSpecialScenarios(navigation, scenario, data);
  }, [navigation, initializeHandler]);

  /**
   * ביצוע ניווט מיועד בלבד (ללא מיזוג)
   */
  const executeIntendedNavigation = useCallback(async () => {
    try {
      const hasIntended = navigationContext.hasIntendedDestination;
      
      if (!hasIntended) {
        console.log('ℹ️ No intended navigation to execute');
        return { success: false, reason: 'no_intended_navigation' };
      }

      const success = await navigationContext.executeIntendedNavigation(navigation);
      
      return { 
        success, 
        type: 'intended_only' 
      };
    } catch (error) {
      console.error('❌ Failed to execute intended navigation:', error);
      return { success: false, reason: 'error', error: error.message };
    }
  }, [navigation, navigationContext]);

  /**
   * ניווט ברירת מחדל
   */
  const navigateToDefault = useCallback((screen = 'Home', params = {}) => {
    try {
      console.log(`🏠 Navigating to default: ${screen}`);
      navigation.navigate(screen, params);
      return { success: true, screen, params };
    } catch (error) {
      console.error('❌ Default navigation failed:', error);
      return { success: false, error: error.message };
    }
  }, [navigation]);

  /**
   * בדיקה אם יש ניווט מיועד
   */
  const hasIntendedDestination = useCallback(() => {
    return navigationContext.hasIntendedDestination;
  }, [navigationContext]);

  /**
   * ביטול ניווט מיועד
   */
  const cancelIntendedNavigation = useCallback(async () => {
    try {
      await navigationContext.clearIntendedDestination();
      console.log('🎯 Intended navigation cancelled');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to cancel intended navigation:', error);
      return { success: false, error: error.message };
    }
  }, [navigationContext]);

  return {
    // Main functions
    handlePostLogin,
    handleSpecialScenario,
    
    // Navigation functions
    executeIntendedNavigation,
    navigateToDefault,
    cancelIntendedNavigation,
    
    // State checks
    hasIntendedDestination,
    
    // Utilities
    initializeHandler,
  };
};
