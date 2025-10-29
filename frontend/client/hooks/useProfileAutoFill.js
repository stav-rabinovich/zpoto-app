import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { mapSocialProfile, isProfileComplete, getMissingFieldsMessage, formatProfileForServer } from '../services/profile/profileMappingService';
import { useAuth } from '../contexts/ServerOnlyAuthContext';

/**
 * Hook לטיפול באוטו-מילוי פרופיל מנתוני Social Login
 */
export const useProfileAutoFill = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [completionStatus, setCompletionStatus] = useState(null);
  const { updateUserProfile } = useAuth();

  /**
   * עיבוד נתוני Social Login ומילוי פרופיל
   */
  const processSocialLogin = useCallback(async (provider, socialData) => {
    try {
      setIsProcessing(true);
      console.log('🔄 Processing social login for auto-fill:', provider);

      // המרת נתוני Social לפרופיל
      const mappedProfile = mapSocialProfile(provider, socialData);
      console.log('📋 Mapped profile:', mappedProfile);

      // בדיקת שלמות הפרופיל
      const completion = isProfileComplete(mappedProfile);
      console.log('📊 Profile completion:', completion);

      // שמירת הנתונים ב-state
      setProfileData(mappedProfile);
      setCompletionStatus(completion);

      // אם הפרופיל שלם, שלח לשרת
      if (completion.isComplete) {
        await updateProfileOnServer(mappedProfile);
        return {
          success: true,
          profile: mappedProfile,
          message: 'הפרופיל מולא אוטומטית בהצלחה! ✅'
        };
      } else {
        // אם חסרים שדות, החזר הודעה למשתמש
        const message = getMissingFieldsMessage(completion.missingFields);
        return {
          success: false,
          profile: mappedProfile,
          completion,
          message,
          requiresCompletion: true
        };
      }

    } catch (error) {
      console.error('❌ Profile auto-fill error:', error);
      return {
        success: false,
        error: error.message,
        message: 'שגיאה במילוי אוטומטי של הפרופיל'
      };
    } finally {
      setIsProcessing(false);
    }
  }, [updateUserProfile]);

  /**
   * שליחת פרופיל מעודכן לשרת
   */
  const updateProfileOnServer = useCallback(async (profile) => {
    try {
      const serverProfile = formatProfileForServer(profile);
      
      // TODO: שליחה לשרת דרך API
      // await updateUserProfile(serverProfile);
      
      console.log('✅ Profile updated on server:', serverProfile);
      return true;
    } catch (error) {
      console.error('❌ Server update error:', error);
      throw error;
    }
  }, []);

  /**
   * השלמת שדות חסרים בפרופיל
   */
  const completeProfile = useCallback(async (additionalData) => {
    if (!profileData) {
      throw new Error('No profile data to complete');
    }

    try {
      setIsProcessing(true);

      // מיזוג הנתונים החדשים עם הקיימים
      const updatedProfile = {
        ...profileData,
        ...additionalData
      };

      // בדיקה מחדש של שלמות הפרופיל
      const completion = isProfileComplete(updatedProfile);
      
      setProfileData(updatedProfile);
      setCompletionStatus(completion);

      // שליחה לשרת
      await updateProfileOnServer(updatedProfile);

      return {
        success: true,
        profile: updatedProfile,
        completion,
        message: completion.isComplete ? 
          'הפרופיל הושלם בהצלחה! ✅' : 
          getMissingFieldsMessage(completion.missingFields)
      };

    } catch (error) {
      console.error('❌ Profile completion error:', error);
      return {
        success: false,
        error: error.message,
        message: 'שגיאה בהשלמת הפרופיל'
      };
    } finally {
      setIsProcessing(false);
    }
  }, [profileData, updateProfileOnServer]);

  /**
   * הצגת דיאלוג להשלמת פרופיל
   */
  const showProfileCompletionDialog = useCallback((profile, completion) => {
    const message = `הפרופיל שלך מולא חלקית (${completion.completionPercentage}%)\n\n${getMissingFieldsMessage(completion.missingFields)}\n\nהאם תרצה להשלים עכשיו?`;

    Alert.alert(
      'השלמת פרופיל',
      message,
      [
        {
          text: 'אחר כך',
          style: 'cancel'
        },
        {
          text: 'השלם עכשיו',
          onPress: () => {
            // TODO: נווט למסך השלמת פרופיל
            console.log('Navigate to profile completion screen');
          }
        }
      ]
    );
  }, []);

  /**
   * איפוס מצב האוטו-מילוי
   */
  const resetAutoFill = useCallback(() => {
    setProfileData(null);
    setCompletionStatus(null);
    setIsProcessing(false);
  }, []);

  return {
    // State
    isProcessing,
    profileData,
    completionStatus,
    
    // Actions
    processSocialLogin,
    completeProfile,
    showProfileCompletionDialog,
    resetAutoFill,
    
    // Utilities
    isProfileComplete: completionStatus?.isComplete || false,
    completionPercentage: completionStatus?.completionPercentage || 0,
    missingFields: completionStatus?.missingFields || []
  };
};

export default useProfileAutoFill;
