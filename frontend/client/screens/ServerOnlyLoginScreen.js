/**
 * מסך התחברות חדש - Server-Only Architecture
 * כל הנתונים מהשרת, אין fallback מקומי
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  StyleSheet 
} from 'react-native';
import { createText, useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// השתמש ב-AuthContext החדש
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from '../hooks/useOfflineMode';
import OfflineScreen from '../components/offline/OfflineScreen';
import ServerErrorScreen from '../components/offline/ServerErrorScreen';

const RText = createText();

export default function ServerOnlyLoginScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const { login, loading: authLoading } = useAuthContext();
  const { isFullyOnline, isOfflineMode, isServerDown, retryConnection } = useOfflineMode();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // בדיקת חיבור בטעינה
  useEffect(() => {
    if (!isFullyOnline) {
      setError(null); // ניקוי שגיאות קודמות
    }
  }, [isFullyOnline]);

  /**
   * טיפול בהתחברות - רק מהשרת
   */
  const handleLogin = async () => {
    // ולידציה בסיסית
    if (!email?.trim() || !password?.trim()) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    // בדיקת חיבור
    if (!isFullyOnline) {
      Alert.alert(
        'אין חיבור לשרת', 
        'בדוק את החיבור לאינטרנט ונסה שוב',
        [
          { text: 'נסה שוב', onPress: retryConnection },
          { text: 'ביטול', style: 'cancel' }
        ]
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Attempting server-only login...');
      
      const result = await login(email.trim().toLowerCase(), password.trim());
      
      if (result.success) {
        console.log('✅ Login successful - user data loaded from server');
        // הניווט יקרה אוטומטי דרך AuthContext
      } else {
        console.error('❌ Login failed:', result.error);
        setError(result.error);
        Alert.alert('שגיאת התחברות', result.error);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error.message || 'שגיאה לא צפויה בהתחברות';
      setError(errorMessage);
      Alert.alert('שגיאת התחברות', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * מעבר להרשמה
   */
  const goToRegister = () => {
    navigation.navigate('Register');
  };

  /**
   * מעבר לשחזור סיסמה
   */
  const goToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  // מסך offline
  if (isOfflineMode) {
    return (
      <OfflineScreen
        title="אין חיבור לאינטרנט"
        message="התחברות דורשת חיבור לאינטרנט. בדוק את החיבור ונסה שוב."
        onRetry={retryConnection}
        retryText="בדוק חיבור"
      />
    );
  }

  // מסך שרת לא זמין
  if (isServerDown) {
    return (
      <ServerErrorScreen
        title="השרת לא זמין"
        error={{ status: 503, message: 'השרת לא זמין כרגע' }}
        onRetry={retryConnection}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* לוגו וכותרת */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="car-sport" size={64} color={colors.primary} />
            </View>
            <RText variant="h1" style={styles.title}>
              Zpoto
            </RText>
            <RText variant="body" style={styles.subtitle}>
              התחבר כדי להמשיך
            </RText>
            
            {/* אינדיקטור חיבור */}
            <View style={styles.connectionStatus}>
              <Ionicons 
                name={isFullyOnline ? "checkmark-circle" : "alert-circle"} 
                size={16} 
                color={isFullyOnline ? colors.success : colors.warning} 
              />
              <RText style={[styles.connectionText, { 
                color: isFullyOnline ? colors.success : colors.warning 
              }]}>
                {isFullyOnline ? 'מחובר לשרת' : 'בודק חיבור...'}
              </RText>
            </View>
          </View>

          {/* טופס התחברות */}
          <View style={styles.form}>
            {/* שדה אימייל */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="כתובת אימייל"
                placeholderTextColor={colors.subtext}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && isFullyOnline}
              />
            </View>

            {/* שדה סיסמה */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="סיסמה"
                placeholderTextColor={colors.subtext}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading && isFullyOnline}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.subtext} 
                />
              </Pressable>
            </View>

            {/* כפתור התחברות */}
            <Pressable
              style={[
                styles.loginButton,
                { backgroundColor: colors.primary },
                (!isFullyOnline || loading) && styles.disabledButton
              ]}
              onPress={handleLogin}
              disabled={!isFullyOnline || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <RText style={styles.loginButtonText}>התחבר</RText>
                </>
              )}
            </Pressable>

            {/* שכחתי סיסמה */}
            <Pressable
              style={styles.forgotPassword}
              onPress={goToForgotPassword}
              disabled={!isFullyOnline}
            >
              <RText style={[styles.forgotPasswordText, { color: colors.primary }]}>
                שכחתי סיסמה
              </RText>
            </Pressable>
          </View>

          {/* הרשמה */}
          <View style={styles.footer}>
            <RText style={[styles.footerText, { color: colors.subtext }]}>
              אין לך חשבון?
            </RText>
            <Pressable
              onPress={goToRegister}
              disabled={!isFullyOnline}
            >
              <RText style={[styles.registerText, { color: colors.primary }]}>
                הירשם כאן
              </RText>
            </Pressable>
          </View>

          {/* הודעת שגיאה */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <RText style={[styles.errorText, { color: colors.error }]}>
                {error}
              </RText>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      color: colors.primary,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.subtext,
      marginBottom: 16,
    },
    connectionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 16,
    },
    connectionText: {
      fontSize: 12,
      marginLeft: 6,
      fontWeight: '600',
    },
    form: {
      marginBottom: 32,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 16,
      textAlign: 'right',
    },
    passwordToggle: {
      padding: 8,
    },
    loginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    disabledButton: {
      opacity: 0.6,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    forgotPassword: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    forgotPasswordText: {
      fontSize: 14,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    footerText: {
      fontSize: 14,
      marginRight: 8,
    },
    registerText: {
      fontSize: 14,
      fontWeight: '600',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error + '10',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    errorText: {
      fontSize: 14,
      marginLeft: 8,
      flex: 1,
    },
  });
}
