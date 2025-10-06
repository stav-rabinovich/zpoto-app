/**
 * מסך Splash חדש - Server-Only Architecture
 * לא טוען נתונים מקומיים, רק בודק token ומחבר לשרת
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { createText, useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from '../hooks/useOfflineMode';
import tokenManager from '../utils/token-manager';
import OfflineScreen from '../components/offline/OfflineScreen';
import ServerErrorScreen from '../components/offline/ServerErrorScreen';

const RText = createText();

export default function ServerOnlySplashScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const { user, token, isReady, loading } = useAuthContext();
  const { 
    isFullyOnline, 
    isOfflineMode, 
    isServerDown, 
    retryConnection,
    getStatusMessage 
  } = useOfflineMode();
  
  const [initializationStep, setInitializationStep] = useState('starting');
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  // אנימציות כניסה
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // תהליך אתחול Server-Only
  useEffect(() => {
    initializeApp();
  }, []);

  // ניווט כשהאתחול מסתיים
  useEffect(() => {
    if (isReady && isFullyOnline) {
      navigateToNextScreen();
    }
  }, [isReady, isFullyOnline, user, token]);

  /**
   * אתחול האפליקציה - Server-Only
   */
  const initializeApp = async () => {
    try {
      console.log('🚀 Starting Server-Only initialization...');
      
      // שלב 1: אתחול token manager
      setInitializationStep('loading_tokens');
      const hasTokens = await tokenManager.loadTokens();
      console.log('🔑 Tokens loaded:', hasTokens);
      
      if (!hasTokens) {
        console.log('ℹ️ No tokens found - user needs to login');
        setInitializationStep('no_auth');
        return;
      }

      // שלב 2: בדיקת חיבור לשרת
      setInitializationStep('checking_connection');
      if (!isFullyOnline) {
        console.log('⚠️ No server connection - waiting...');
        setInitializationStep('waiting_connection');
        return;
      }

      // שלב 3: בדיקת תקינות token
      setInitializationStep('validating_token');
      const tokenInfo = tokenManager.getTokenInfo();
      console.log('🔍 Token info:', tokenInfo);

      if (tokenInfo.needsRefresh) {
        console.log('🔄 Token needs refresh...');
        const refreshed = await tokenManager.refreshTokenIfNeeded();
        if (!refreshed) {
          console.log('❌ Token refresh failed - user needs to login');
          setInitializationStep('auth_failed');
          return;
        }
      }

      // שלב 4: טעינת נתוני משתמש מהשרת
      setInitializationStep('loading_user');
      console.log('👤 Loading user data from server...');
      
      // AuthContext יטפל בטעינת המשתמש אוטומטית
      // אנחנו רק מחכים שהוא יסיים
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      setError(error.message);
      setInitializationStep('error');
    }
  };

  /**
   * ניווט למסך הבא
   */
  const navigateToNextScreen = () => {
    setTimeout(() => {
      if (token && user) {
        console.log('✅ User authenticated - navigating to main app');
        navigation.replace('MainTabs');
      } else {
        console.log('ℹ️ User not authenticated - navigating to login');
        navigation.replace('Login');
      }
    }, 500); // המתנה קצרה לאנימציה
  };

  /**
   * ניסיון חוזר
   */
  const handleRetry = async () => {
    setError(null);
    setInitializationStep('starting');
    
    // ניסיון התחברות מחדש
    const connectionResult = await retryConnection();
    
    if (connectionResult.internetOk && connectionResult.serverOk) {
      // אתחול מחדש
      await initializeApp();
    }
  };

  /**
   * מעבר ישיר לlogin
   */
  const goToLogin = () => {
    navigation.replace('Login');
  };

  /**
   * קבלת הודעת סטטוס
   */
  const getStepMessage = () => {
    switch (initializationStep) {
      case 'starting':
        return 'מתחיל...';
      case 'loading_tokens':
        return 'טוען נתוני אימות...';
      case 'checking_connection':
        return 'בודק חיבור לשרת...';
      case 'waiting_connection':
        return 'ממתין לחיבור...';
      case 'validating_token':
        return 'מאמת אימות...';
      case 'loading_user':
        return 'טוען פרטי משתמש...';
      case 'no_auth':
        return 'מעבר להתחברות...';
      case 'auth_failed':
        return 'נדרשת התחברות מחדש...';
      case 'error':
        return 'שגיאה באתחול';
      default:
        return 'טוען...';
    }
  };

  // מסך offline
  if (isOfflineMode && initializationStep === 'waiting_connection') {
    return (
      <OfflineScreen
        title="אין חיבור לאינטרנט"
        message="האפליקציה דורשת חיבור לאינטרנט כדי לפעול. בדוק את החיבור ונסה שוב."
        onRetry={handleRetry}
        retryText="נסה שוב"
        customAction={{
          text: 'עבור להתחברות',
          onPress: goToLogin
        }}
      />
    );
  }

  // מסך שרת לא זמין
  if (isServerDown && initializationStep === 'waiting_connection') {
    return (
      <ServerErrorScreen
        title="השרת לא זמין"
        error={{ status: 503, message: 'השרת לא זמין כרגע' }}
        onRetry={handleRetry}
        onGoBack={goToLogin}
      />
    );
  }

  // מסך שגיאה
  if (error || initializationStep === 'error') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary + '10', colors.bg]}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={64} color={colors.error} />
              <RText style={[styles.errorTitle, { color: colors.error }]}>
                שגיאה באתחול
              </RText>
              <RText style={[styles.errorMessage, { color: colors.subtext }]}>
                {error || 'אירעה שגיאה לא צפויה'}
              </RText>
              
              <View style={styles.errorActions}>
                <Pressable
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={handleRetry}
                >
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <RText style={styles.retryButtonText}>נסה שוב</RText>
                </Pressable>
                
                <Pressable
                  style={[styles.loginButton, { borderColor: colors.primary }]}
                  onPress={goToLogin}
                >
                  <RText style={[styles.loginButtonText, { color: colors.primary }]}>
                    עבור להתחברות
                  </RText>
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // מסך טעינה רגיל
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary + '20', colors.bg]}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* לוגו */}
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={80} color={colors.primary} />
          </View>
          
          {/* כותרת */}
          <RText style={[styles.title, { color: colors.primary }]}>
            Zpoto
          </RText>
          
          {/* אינדיקטור טעינה */}
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="large" 
              color={colors.primary} 
              style={styles.spinner}
            />
            <RText style={[styles.loadingText, { color: colors.subtext }]}>
              {getStepMessage()}
            </RText>
          </View>
          
          {/* אינדיקטור חיבור */}
          <View style={styles.connectionIndicator}>
            <Ionicons 
              name={isFullyOnline ? "checkmark-circle" : "time-outline"} 
              size={16} 
              color={isFullyOnline ? colors.success : colors.warning} 
            />
            <RText style={[
              styles.connectionText, 
              { color: isFullyOnline ? colors.success : colors.warning }
            ]}>
              {getStatusMessage()}
            </RText>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      marginBottom: 40,
    },
    loadingContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    spinner: {
      marginBottom: 16,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '500',
    },
    connectionIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    connectionText: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
    },
    errorContainer: {
      alignItems: 'center',
      maxWidth: 300,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    errorActions: {
      width: '100%',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    loginButton: {
      alignItems: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 2,
    },
    loginButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
