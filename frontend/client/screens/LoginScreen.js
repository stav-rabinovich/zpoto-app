import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { createText, useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { Ionicons } from '@expo/vector-icons';
import ZpButton from '../components/ui/ZpButton';

const RText = createText();

export default function LoginScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { login } = useAuth();
  const { executeIntendedNavigation } = useNavigationContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // מילוי אוטומטי של האימייל אם הועבר מההרשמה
  useEffect(() => {
    const prefillEmail = route?.params?.prefillEmail;
    if (prefillEmail) {
      console.log('📧 Pre-filling email from registration:', prefillEmail);
      setEmail(prefillEmail);
    }
  }, [route?.params?.prefillEmail]);

  // פונקציה להמשך התחברות רגילה (מחפש חניות)
  const proceedWithRegularLogin = async () => {
    console.log('✅ Dual-role user proceeding with regular login...');
    
    const navigated = await executeIntendedNavigation(navigation);
    
    if (!navigated) {
      // אין destination מיועד - נחזור לדף הבית ונאפס את ה-stack
      console.log('🏠 No intended destination, resetting to Home');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);

    if (result.success) {
      // התחברות מוצלחת - נבדוק אם המשתמש הוא בעל חניה
      console.log('✅ Basic login successful, checking if user is owner...');
      
      try {
        const statusResponse = await api.get(`/api/owner/status?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        const userStatus = statusResponse.data.status;
        
        console.log(`📊 User status check: status=${userStatus}`);
        
        if (userStatus === 'approved') {
          // המשתמש הוא בעל חניה מאושר - נשאל אותו מה הוא רוצה לעשות
          setLoading(false);
          Alert.alert(
            '👋 ברוך הבא!', 
            'זיהינו שאתה גם בעל חניה רשום. איך תרצה להמשיך?',
            [
              {
                text: '🏠 ניהול החניות שלי',
                onPress: () => {
                  // ניווט לממשק בעלי החניה
                  console.log('🏠 User chose owner interface');
                  navigation.navigate('OwnerIntro');
                },
                style: 'default'
              },
              {
                text: '🔍 חיפוש חניות',
                onPress: () => {
                  // המשך בממשק הרגיל (מחפש חניות)
                  console.log('🔍 User chose search interface');
                  proceedWithRegularLogin();
                },
                style: 'default'
              }
            ]
          );
          return;
        } else if (userStatus === 'pending') {
          // המשתמש הגיש בקשה להיות בעל חניה אבל עדיין לא אושר - זה בסדר, יכול להמשיך כמחפש
          console.log('✅ User has pending owner request but can continue as regular user');
        }
        
        // המשתמש רגיל או pending - יכול להמשיך
        console.log('✅ Regular user login approved, checking for intended navigation...');
        
        const navigated = await executeIntendedNavigation(navigation);
        
        if (!navigated) {
          // אין destination מיועד - נבדוק אם המשתמש חדש ונעביר לפרופיל
          const userData = result.user || {};
          const isNewUser = !userData.name || !userData.phone; // אם חסרים פרטים בסיסיים
          
          if (isNewUser) {
            console.log('👤 New user detected, redirecting to Profile to complete details');
            // הודעת ברכה למשתמש חדש
            setTimeout(() => {
              Alert.alert(
                '🎉 ברוך הבא!',
                'בואו נשלים את הפרטים שלך כדי שנוכל לשרת אותך בצורה הטובה ביותר',
                [{ text: 'בואו נתחיל!', style: 'default' }]
              );
            }, 500);
            
            navigation.reset({
              index: 0,
              routes: [
                { name: 'Home' },
                { name: 'Profile' }
              ],
            });
          } else {
            console.log('🏠 Existing user, resetting to Home');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }
        }
        
      } catch (statusError) {
        console.error('❌ Status check failed:', statusError);
        // אם יש בעיה בבדיקת הסטטוס, נתן למשתמש להמשיך (fallback)
        console.log('⚠️ Status check failed, allowing regular login as fallback');
        
        const navigated = await executeIntendedNavigation(navigation);
        
        if (!navigated) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }
      }
      
    } else {
      Alert.alert('שגיאת התחברות', result.error);
    }
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <Ionicons name="car-sport" size={24} color={theme.colors.primary} style={{ marginBottom: 8 }} />
          <RText style={styles.header}>ברוך הבא ל-Zpoto</RText>
          <RText style={styles.subtitle}>התחבר לחשבון שלך כדי למצוא חניה בקלות</RText>
        </View>
        
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons name="log-in" size={16} color="#fff" style={styles.cardIconWrap} />
            <RText style={styles.section}>התחברות</RText>
          </View>

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
            placeholder="הזן את הסיסמה שלך"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <ZpButton 
            title={loading ? "מתחבר..." : "התחבר לחשבון"} 
            onPress={handleLogin} 
            disabled={loading}
            style={{ marginTop: theme.spacing.lg }} 
          />
        </View>

        {/* קישור להרשמה */}
        <View style={styles.card}>
          <RText style={styles.centerText}>
            עדיין אין לך חשבון?{' '}
            <RText 
              style={[styles.centerText, { color: theme.colors.primary, fontWeight: '700' }]}
              onPress={() => navigation.navigate('Register')}
            >
              הירשם עכשיו
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
