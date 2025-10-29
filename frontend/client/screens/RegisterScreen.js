import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createText, useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const RText = createText();

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const { register } = useAuth();
  const { executeIntendedNavigation } = useNavigationContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    if (password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);
    const result = await register(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      // הרשמה מוצלחת - מעבר למסך התחברות עם האימייל שהוזן
      console.log('✅ Registration successful, navigating to Login screen');
      Alert.alert(
        'הרשמה מוצלחת!', 
        'כעת תוכל להתחבר עם הפרטים שהזנת',
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
              צור חשבון חדש
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
          <View style={{ marginBottom: 16 }}>
            <RText variant="small" style={{ marginBottom: 8, color: colors.text, fontWeight: '600' }}>
              סיסמה
            </RText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="לפחות 6 תווים"
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

          {/* אימות סיסמה */}
          <View style={{ marginBottom: 24 }}>
            <RText variant="small" style={{ marginBottom: 8, color: colors.text, fontWeight: '600' }}>
              אימות סיסמה
            </RText>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="הזן שוב את הסיסמה"
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

          {/* כפתור הרשמה */}
          <Pressable
            onPress={handleRegister}
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
                  הירשם
                </RText>
              )}
            </LinearGradient>
          </Pressable>

          {/* קישור להתחברות */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <RText variant="body" style={{ color: colors.subtext }}>
              כבר יש לך חשבון?{' '}
            </RText>
            <Pressable onPress={() => navigation.goBack()}>
              <RText variant="body" style={{ color: colors.primary, fontWeight: '700' }}>
                התחבר
              </RText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
