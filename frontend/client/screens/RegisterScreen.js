import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { createText, useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { Ionicons } from '@expo/vector-icons';
import ZpButton from '../components/ui/ZpButton';

const RText = createText();

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { register } = useAuth();
  const { executeIntendedNavigation } = useNavigationContext();
  
  // שדות הרשמה מורחבים
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // פונקציות ולידציה
  const validateName = (name) => {
    if (!name || name.trim().length < 2) {
      return 'שם מלא חייב להכיל לפחות 2 תווים';
    }
    return null;
  };

  const validatePhone = (phoneNum) => {
    if (!phoneNum || phoneNum.trim().length === 0) {
      return 'מספר טלפון הוא שדה חובה';
    }
    const phoneRegex = /^0[2-9]\d{7,8}$/;
    if (!phoneRegex.test(phoneNum.replace(/[-\s]/g, ''))) {
      return 'מספר טלפון לא תקין (לדוגמה: 050-123-4567)';
    }
    return null;
  };

  const validateEmail = (emailAddr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddr)) {
      return 'כתובת אימייל לא תקינה';
    }
    return null;
  };

  const handleRegister = async () => {
    // ולידציות מקיפות
    const nameError = validateName(fullName);
    if (nameError) {
      Alert.alert('שגיאה', nameError);
      return;
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      Alert.alert('שגיאה', phoneError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('שגיאה', emailError);
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);
    
    try {
      // שליחת הנתונים המלאים לשרת
      const result = await register(
        email.trim().toLowerCase(), 
        password,
        fullName.trim(),
        phone.trim()
      );
      
      setLoading(false);

      if (result.success) {
        console.log('✅ Registration successful with full profile data');
        Alert.alert(
          '🎉 הרשמה מוצלחת!', 
          `שלום ${fullName}! כעת תוכל להתחבר ולהשלים את פרטי הרכב שלך`,
          [
            {
              text: 'התחבר עכשיו',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Home' },
                    { 
                      name: 'Login', 
                      params: { prefillEmail: email.trim().toLowerCase() } 
                    }
                  ],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('שגיאת הרשמה', result.error);
      }
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בהרשמה. נסה שוב.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <Ionicons name="car-sport" size={24} color={theme.colors.primary} style={{ marginBottom: 8 }} />
          <RText style={styles.header}>הצטרף ל-Zpoto</RText>
          <RText style={styles.subtitle}>מלא את הפרטים שלך כדי ליצור חשבון חדש</RText>
        </View>
        
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons name="person-add" size={16} color="#fff" style={styles.cardIconWrap} />
            <RText style={styles.section}>פרטים אישיים</RText>
          </View>

          <RText style={styles.label}>שם מלא</RText>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="לדוגמה: ישראל ישראלי"
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
          />

          <RText style={styles.label}>מספר טלפון</RText>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="050-123-4567"
            keyboardType="phone-pad"
            autoCorrect={false}
            style={styles.input}
          />

          <RText style={styles.label}>כתובת אימייל</RText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <RText style={styles.label}>סיסמה</RText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="לפחות 6 תווים"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <RText style={styles.label}>אימות סיסמה</RText>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="הזן שוב את הסיסמה"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <ZpButton 
            title={loading ? "יוצר חשבון..." : "צור חשבון חדש"} 
            onPress={handleRegister} 
            disabled={loading}
            style={{ marginTop: theme.spacing.lg }} 
          />
        </View>

        {/* קישור להתחברות */}
        <View style={styles.card}>
          <RText style={styles.centerText}>
            כבר יש לך חשבון?{' '}
            <RText 
              style={[styles.centerText, { color: theme.colors.primary, fontWeight: '700' }]}
              onPress={() => navigation.goBack()}
            >
              התחבר כאן
            </RText>
          </RText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: { 
      padding: spacing.lg, 
      backgroundColor: colors.bg, 
      direction: 'rtl',
      flexGrow: 1,
      justifyContent: 'center'
    },
    center: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: colors.bg 
    },
    centerText: { 
      color: colors.text, 
      textAlign: 'center' 
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    header: { 
      fontSize: 22, 
      fontWeight: '800', 
      textAlign: 'center', 
      marginBottom: spacing.xs, 
      color: colors.text 
    },
    subtitle: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor: '#000', 
      shadowOpacity: 0.06, 
      shadowRadius: 12, 
      shadowOffset: { width: 0, height: 6 }, 
      elevation: 2,
      borderWidth: 1, 
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 8,
      marginBottom: spacing.sm,
    },
    cardIconWrap: {
      width: 24, 
      height: 24, 
      borderRadius: 12,
      textAlignVertical: 'center',
      textAlign: 'center',
      backgroundColor: colors.primary,
      color: '#fff',
      overflow: 'hidden',
      paddingTop: 3,
    },
    section: { 
      fontSize: 16, 
      fontWeight: '700', 
      color: colors.text, 
      textAlign: 'left', 
      flex: 1, 
      writingDirection: 'ltr' 
    },
    label: { 
      fontSize: 13, 
      color: colors.subtext, 
      marginBottom: 6, 
      marginTop: 6, 
      textAlign: 'left', 
      writingDirection: 'ltr' 
    },
    input: {
      height: 48,
      borderRadius: borderRadii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      fontSize: 15,
      marginBottom: 8,
      color: colors.text,
      textAlign: 'right',
      writingDirection: 'rtl'
    },
  });
}
