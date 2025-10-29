import { useNavigationContext } from '../../contexts/NavigationContext';
import { useMigration } from '../../hooks/useMigration';

/**
 * Post-Login Navigation Handler
 * מטפל בניווט לאחר התחברות מוצלחת, כולל מיזוג נתונים והמשכיות
 */
class PostLoginNavigationHandler {
  
  constructor() {
    this.navigationContext = null;
    this.migrationHook = null;
  }

  /**
   * אתחול עם contexts נדרשים
   */
  initialize(navigationContext, migrationHook) {
    this.navigationContext = navigationContext;
    this.migrationHook = migrationHook;
  }

  /**
   * טיפול מלא בתהליך שלאחר התחברות
   * @param {Object} navigation - React Navigation object
   * @param {Object} loginResult - תוצאת ההתחברות
   * @param {Object} options - אפשרויות נוספות
   */
  async handlePostLogin(navigation, loginResult, options = {}) {
    try {
      console.log('🚀 PostLoginNavigationHandler: Starting post-login process...');
      
      const result = {
        navigation: { success: false },
        migration: { success: false },
        errors: []
      };

      // שלב 1: טיפול במיזוג נתונים (אם יש)
      if (loginResult.migration) {
        result.migration = await this.handleDataMigration(loginResult.migration);
      }

      // שלב 2: ביצוע ניווט מיועד
      result.navigation = await this.handleIntendedNavigation(navigation, options);

      // שלב 3: ניווט ברירת מחדל אם לא היה ניווט מיועד
      if (!result.navigation.success) {
        result.navigation = await this.handleDefaultNavigation(navigation, options);
      }

      console.log('✅ PostLoginNavigationHandler: Process completed:', result);
      return result;

    } catch (error) {
      console.error('❌ PostLoginNavigationHandler: Process failed:', error);
      return {
        navigation: { success: false, error: error.message },
        migration: { success: false, error: error.message },
        errors: [error.message]
      };
    }
  }

  /**
   * טיפול במיזוג נתונים
   */
  async handleDataMigration(migrationResult) {
    try {
      console.log('🔄 PostLoginNavigationHandler: Processing data migration...');

      if (!migrationResult || !migrationResult.migrated) {
        console.log('ℹ️ No data migration needed');
        return { success: true, migrated: false };
      }

      // אם היה מיזוג, נציג הודעה למשתמש (אופציונלי)
      const migrationData = migrationResult.result;
      if (migrationData && migrationData.migration) {
        const { favorites, savedPlaces, recentSearches } = migrationData.migration;
        const totalMigrated = favorites.migrated + savedPlaces.migrated + recentSearches.migrated;
        
        if (totalMigrated > 0) {
          console.log(`✅ Successfully migrated ${totalMigrated} items from guest session`);
          
          // כאן ניתן להוסיף Toast או Alert למשתמש
          // Alert.alert('ברוך הבא!', `העברנו ${totalMigrated} פריטים מהגלישה האנונימית שלך`);
        }
      }

      return { 
        success: true, 
        migrated: true, 
        data: migrationData 
      };

    } catch (error) {
      console.error('❌ Migration handling failed:', error);
      return { 
        success: false, 
        migrated: false, 
        error: error.message 
      };
    }
  }

  /**
   * ביצוע ניווט מיועד
   */
  async handleIntendedNavigation(navigation, options = {}) {
    try {
      if (!this.navigationContext) {
        console.log('⚠️ NavigationContext not initialized');
        return { success: false, reason: 'context_not_initialized' };
      }

      const hasIntended = this.navigationContext.hasIntendedDestination;
      
      if (!hasIntended) {
        console.log('ℹ️ No intended navigation found');
        return { success: false, reason: 'no_intended_navigation' };
      }

      console.log('🎯 Executing intended navigation...');
      const success = await this.navigationContext.executeIntendedNavigation(navigation);
      
      if (success) {
        console.log('✅ Intended navigation executed successfully');
        return { success: true, type: 'intended' };
      } else {
        console.log('❌ Failed to execute intended navigation');
        return { success: false, reason: 'execution_failed' };
      }

    } catch (error) {
      console.error('❌ Intended navigation handling failed:', error);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  /**
   * ניווט ברירת מחדל
   */
  async handleDefaultNavigation(navigation, options = {}) {
    try {
      const defaultScreen = options.defaultScreen || 'Home';
      const defaultParams = options.defaultParams || {};

      console.log(`🏠 Navigating to default screen: ${defaultScreen}`);
      
      navigation.navigate(defaultScreen, defaultParams);
      
      return { 
        success: true, 
        type: 'default', 
        screen: defaultScreen,
        params: defaultParams 
      };

    } catch (error) {
      console.error('❌ Default navigation failed:', error);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  /**
   * טיפול בתרחישים מיוחדים
   */
  async handleSpecialScenarios(navigation, scenario, data = {}) {
    try {
      console.log(`🎭 Handling special scenario: ${scenario}`);

      switch (scenario) {
        case 'first_time_user':
          return await this.handleFirstTimeUser(navigation, data);
        
        case 'returning_user':
          return await this.handleReturningUser(navigation, data);
        
        case 'social_login_new_user':
          return await this.handleSocialLoginNewUser(navigation, data);
        
        case 'profile_incomplete':
          return await this.handleIncompleteProfile(navigation, data);
        
        default:
          console.log(`⚠️ Unknown scenario: ${scenario}`);
          return { success: false, reason: 'unknown_scenario' };
      }

    } catch (error) {
      console.error(`❌ Special scenario handling failed (${scenario}):`, error);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  /**
   * טיפול במשתמש חדש
   */
  async handleFirstTimeUser(navigation, data) {
    console.log('👋 Handling first time user');
    
    // ניווט למסך הכרות או הדרכה
    navigation.navigate('Welcome', { isFirstTime: true });
    
    return { success: true, type: 'first_time_user' };
  }

  /**
   * טיפול במשתמש חוזר
   */
  async handleReturningUser(navigation, data) {
    console.log('🔄 Handling returning user');
    
    // ניווט למסך הבית או למסך האחרון שבו היה
    navigation.navigate('Home');
    
    return { success: true, type: 'returning_user' };
  }

  /**
   * טיפול במשתמש חדש מהתחברות חברתית
   */
  async handleSocialLoginNewUser(navigation, data) {
    console.log('🌐 Handling social login new user');
    
    // בדיקה אם הפרופיל מלא או דורש השלמה
    if (data.profileIncomplete) {
      navigation.navigate('CompleteProfile', { socialData: data.socialData });
    } else {
      navigation.navigate('Welcome', { isNewUser: true, isSocialLogin: true });
    }
    
    return { success: true, type: 'social_login_new_user' };
  }

  /**
   * טיפול בפרופיל לא מלא
   */
  async handleIncompleteProfile(navigation, data) {
    console.log('📝 Handling incomplete profile');
    
    navigation.navigate('CompleteProfile', { requiredFields: data.missingFields });
    
    return { success: true, type: 'profile_incomplete' };
  }
}

// יצירת instance יחיד
const postLoginNavigationHandler = new PostLoginNavigationHandler();

export default postLoginNavigationHandler;
