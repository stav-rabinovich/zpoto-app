import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createText, useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

const RText = createText();

export default function LoginScreen({ navigation, route }) {
  const { colors } = useTheme();
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
          // אין destination מיועד - נחזור לדף הבית ונאפס את ה-stack
          console.log('🏠 No intended destination, resetting to Home');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
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
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          {/* לוגו / כותרת */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Ionicons name="car-sport" size={64} color={colors.primary} />
            <RText variant="h1" style={{ marginTop: 16, color: colors.primary }}>
              Zpoto
            </RText>
            <RText variant="body" style={{ marginTop: 8, color: colors.subtext }}>
              התחבר כדי להמשיך
            </RText>
          </View>

          {/* אימייל */}
          <View style={{ marginBottom: 16 }}>
            <RText variant="small" style={{ marginBottom: 8, color: colors.text, fontWeight: '600' }}>
              אימייל
            </RText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          </View>

          {/* סיסמה */}
          <View style={{ marginBottom: 24 }}>
            <RText variant="small" style={{ marginBottom: 8, color: colors.text, fontWeight: '600' }}>
              סיסמה
            </RText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          </View>

          {/* כפתור התחברות */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 16,
                alignItems: 'center',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <RText variant="body" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  התחבר
                </RText>
              )}
            </LinearGradient>
          </Pressable>

          {/* קישור להרשמה */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <RText variant="body" style={{ color: colors.subtext }}>
              עדיין אין לך חשבון?{' '}
            </RText>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <RText variant="body" style={{ color: colors.primary, fontWeight: '700' }}>
                הירשם
              </RText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
