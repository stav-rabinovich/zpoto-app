/**
 * מסך הרשמה חדש - Server-Only Architecture
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

import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from '../hooks/useOfflineMode';
import OfflineScreen from '../components/offline/OfflineScreen';
import ServerErrorScreen from '../components/offline/ServerErrorScreen';

const RText = createText();

export default function ServerOnlyRegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const { register, loading: authLoading } = useAuthContext();
  const { isFullyOnline, isOfflineMode, isServerDown, retryConnection } = useOfflineMode();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // בדיקת חיבור בטעינה
  useEffect(() => {
    if (!isFullyOnline) {
      setError(null);
    }
  }, [isFullyOnline]);

  /**
   * עדכון שדה בטופס
   */
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // ניקוי שגיאת validation של השדה
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  /**
   * ולידציה של הטופס
   */
  const validateForm = () => {
    const errors = {};

    // שם
    if (!formData.name?.trim()) {
      errors.name = 'נא להזין שם מלא';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'השם חייב להכיל לפחות 2 תווים';
    }

    // אימייל
    if (!formData.email?.trim()) {
      errors.email = 'נא להזין כתובת אימייל';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'כתובת אימייל לא תקינה';
    }

    // סיסמה
    if (!formData.password) {
      errors.password = 'נא להזין סיסמה';
    } else if (formData.password.length < 6) {
      errors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
    }

    // אישור סיסמה
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'נא לאשר את הסיסמה';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'הסיסמאות אינן תואמות';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * טיפול בהרשמה - רק מהשרת
   */
  const handleRegister = async () => {
    // ולידציה
    if (!validateForm()) {
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
      console.log('📝 Attempting server-only registration...');
      
      const result = await register(
        formData.email.trim().toLowerCase(),
        formData.password.trim(),
        formData.name.trim()
      );
      
      if (result.success) {
        console.log('✅ Registration successful - user data loaded from server');
        Alert.alert(
          'הרשמה הושלמה',
          'ברוך הבא! החשבון שלך נוצר בהצלחה.',
          [{ text: 'המשך', onPress: () => {/* הניווט יקרה אוטומטי */} }]
        );
      } else {
        console.error('❌ Registration failed:', result.error);
        setError(result.error);
        Alert.alert('שגיאת הרשמה', result.error);
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const errorMessage = error.message || 'שגיאה לא צפויה בהרשמה';
      setError(errorMessage);
      Alert.alert('שגיאת הרשמה', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * מעבר להתחברות
   */
  const goToLogin = () => {
    navigation.navigate('Login');
  };

  // מסך offline
  if (isOfflineMode) {
    return (
      <OfflineScreen
        title="אין חיבור לאינטרנט"
        message="הרשמה דורשת חיבור לאינטרנט. בדוק את החיבור ונסה שוב."
        onRetry={retryConnection}
        retryText="בדוק חיבור"
        customAction={{
          text: 'חזור להתחברות',
          onPress: goToLogin
        }}
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
        onGoBack={goToLogin}
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
          {/* כותרת */}
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            
            <View style={styles.titleContainer}>
              <RText variant="h2" style={styles.title}>
                הרשמה
              </RText>
              <RText variant="body" style={styles.subtitle}>
                צור חשבון חדש
              </RText>
            </View>
            
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

          {/* טופס הרשמה */}
          <View style={styles.form}>
            {/* שם מלא */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputContainer,
                validationErrors.name && styles.inputError
              ]}>
                <Ionicons name="person-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="שם מלא"
                  placeholderTextColor={colors.subtext}
                  value={formData.name}
                  onChangeText={(value) => updateField('name', value)}
                  editable={!loading && isFullyOnline}
                  autoCapitalize="words"
                />
              </View>
              {validationErrors.name && (
                <RText style={styles.errorText}>{validationErrors.name}</RText>
              )}
            </View>

            {/* אימייל */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputContainer,
                validationErrors.email && styles.inputError
              ]}>
                <Ionicons name="mail-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="כתובת אימייל"
                  placeholderTextColor={colors.subtext}
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && isFullyOnline}
                />
              </View>
              {validationErrors.email && (
                <RText style={styles.errorText}>{validationErrors.email}</RText>
              )}
            </View>

            {/* סיסמה */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputContainer,
                validationErrors.password && styles.inputError
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="סיסמה"
                  placeholderTextColor={colors.subtext}
                  value={formData.password}
                  onChangeText={(value) => updateField('password', value)}
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
              {validationErrors.password && (
                <RText style={styles.errorText}>{validationErrors.password}</RText>
              )}
            </View>

            {/* אישור סיסמה */}
            <View style={styles.inputGroup}>
              <View style={[
                styles.inputContainer,
                validationErrors.confirmPassword && styles.inputError
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="אישור סיסמה"
                  placeholderTextColor={colors.subtext}
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading && isFullyOnline}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={colors.subtext} 
                  />
                </Pressable>
              </View>
              {validationErrors.confirmPassword && (
                <RText style={styles.errorText}>{validationErrors.confirmPassword}</RText>
              )}
            </View>

            {/* כפתור הרשמה */}
            <Pressable
              style={[
                styles.registerButton,
                { backgroundColor: colors.primary },
                (!isFullyOnline || loading) && styles.disabledButton
              ]}
              onPress={handleRegister}
              disabled={!isFullyOnline || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <RText style={styles.registerButtonText}>הירשם</RText>
                </>
              )}
            </Pressable>
          </View>

          {/* התחברות */}
          <View style={styles.footer}>
            <RText style={[styles.footerText, { color: colors.subtext }]}>
              יש לך כבר חשבון?
            </RText>
            <Pressable
              onPress={goToLogin}
              disabled={!isFullyOnline}
            >
              <RText style={[styles.loginText, { color: colors.primary }]}>
                התחבר כאן
              </RText>
            </Pressable>
          </View>

          {/* הודעת שגיאה */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <RText style={[styles.errorMessage, { color: colors.error }]}>
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
    },
    header: {
      marginBottom: 32,
      marginTop: 20,
    },
    backButton: {
      alignSelf: 'flex-start',
      padding: 8,
      marginBottom: 16,
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.subtext,
      marginBottom: 16,
    },
    connectionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 16,
      alignSelf: 'center',
    },
    connectionText: {
      fontSize: 12,
      marginLeft: 6,
      fontWeight: '600',
    },
    form: {
      marginBottom: 32,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputError: {
      borderColor: colors.error,
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
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 4,
      textAlign: 'right',
    },
    registerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 8,
    },
    disabledButton: {
      opacity: 0.6,
    },
    registerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
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
    loginText: {
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
    errorMessage: {
      fontSize: 14,
      marginLeft: 8,
      flex: 1,
    },
  });
}
