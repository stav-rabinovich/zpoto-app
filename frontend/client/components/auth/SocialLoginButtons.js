import React, { useState } from 'react';
import { View, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { createText, useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';

// Social Login imports - conditional לטיפול בשגיאות native modules
let GoogleSignin = null;
let statusCodes = null;
try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (e) {
  console.warn('⚠️ Google Sign-in module לא זמין:', e.message);
}

let LoginManager = null;
let AccessToken = null;
try {
  const fbModule = require('react-native-fbsdk-next');
  LoginManager = fbModule.LoginManager;
  AccessToken = fbModule.AccessToken;
} catch (e) {
  console.warn('⚠️ Facebook SDK module לא זמין:', e.message);
}

let appleAuth = null;
try {
  appleAuth = require('@invertase/react-native-apple-authentication').default;
} catch (e) {
  console.warn('⚠️ Apple Auth module לא זמין:', e.message);
}

const RText = createText();

/**
 * קומפוננטת כפתורי Social Login
 * תומכת ב-Google, Facebook ו-Apple Sign-In
 */
export const SocialLoginButtons = ({ onSocialLogin, disabled = false }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [loading, setLoading] = useState({ google: false, facebook: false, apple: false });

  /**
   * התחברות עם Google
   */
  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      Alert.alert('שגיאה', 'Google Sign-In לא זמין במכשיר זה');
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, google: true }));
      
      // בדיקה אם Google Play Services זמינים
      await GoogleSignin.hasPlayServices();
      
      // קבלת פרטי המשתמש
      const userInfo = await GoogleSignin.signIn();
      
      console.log('🔍 Google Sign-In Success:', userInfo);
      
      // העברת הנתונים לקומפוננטה האב
      if (onSocialLogin) {
        await onSocialLogin('google', {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name,
          photo: userInfo.user.photo,
          idToken: userInfo.idToken,
          accessToken: userInfo.accessToken,
        });
      }
      
    } catch (error) {
      console.error('❌ Google Sign-In Error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // המשתמש ביטל
        console.log('Google Sign-In cancelled by user');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('שגיאה', 'התחברות עם Google כבר בתהליך');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('שגיאה', 'Google Play Services לא זמינים במכשיר');
      } else {
        Alert.alert('שגיאת התחברות', 'לא הצלחנו להתחבר עם Google. נסה שוב.');
      }
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  };

  /**
   * התחברות עם Facebook
   */
  const handleFacebookSignIn = async () => {
    if (!LoginManager || !AccessToken) {
      Alert.alert('שגיאה', 'Facebook Sign-In לא זמין במכשיר זה');
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, facebook: true }));
      
      // התחברות עם Facebook
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
      if (result.isCancelled) {
        console.log('Facebook Sign-In cancelled by user');
        return;
      }
      
      // קבלת Access Token
      const data = await AccessToken.getCurrentAccessToken();
      
      if (!data) {
        throw new Error('Failed to get Facebook access token');
      }
      
      // קבלת פרטי המשתמש מ-Facebook Graph API
      const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${data.accessToken}`);
      const userInfo = await response.json();
      
      console.log('🔍 Facebook Sign-In Success:', userInfo);
      
      // העברת הנתונים לקומפוננטה האב
      if (onSocialLogin) {
        await onSocialLogin('facebook', {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          photo: userInfo.picture?.data?.url,
          accessToken: data.accessToken,
        });
      }
      
    } catch (error) {
      console.error('❌ Facebook Sign-In Error:', error);
      Alert.alert('שגיאת התחברות', 'לא הצלחנו להתחבר עם Facebook. נסה שוב.');
    } finally {
      setLoading(prev => ({ ...prev, facebook: false }));
    }
  };

  /**
   * התחברות עם Apple (iOS בלבד)
   */
  const handleAppleSignIn = async () => {
    if (!appleAuth) {
      Alert.alert('שגיאה', 'Apple Sign-In לא זמין במכשיר זה');
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, apple: true }));
      
      // בדיקה אם Apple Sign-In זמין
      if (!appleAuth.isSupported) {
        Alert.alert('שגיאה', 'Apple Sign-In לא נתמך במכשיר זה');
        return;
      }
      
      // התחברות עם Apple
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      
      // בדיקת תוצאה
      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);
      
      if (credentialState === appleAuth.State.AUTHORIZED) {
        console.log('🔍 Apple Sign-In Success:', appleAuthRequestResponse);
        
        // העברת הנתונים לקומפוננטה האב
        if (onSocialLogin) {
          await onSocialLogin('apple', {
            id: appleAuthRequestResponse.user,
            email: appleAuthRequestResponse.email,
            name: appleAuthRequestResponse.fullName ? 
              `${appleAuthRequestResponse.fullName.givenName || ''} ${appleAuthRequestResponse.fullName.familyName || ''}`.trim() : null,
            identityToken: appleAuthRequestResponse.identityToken,
            authorizationCode: appleAuthRequestResponse.authorizationCode,
          });
        }
      } else {
        throw new Error('Apple Sign-In not authorized');
      }
      
    } catch (error) {
      console.error('❌ Apple Sign-In Error:', error);
      
      if (error.code === appleAuth.Error.CANCELED) {
        console.log('Apple Sign-In cancelled by user');
      } else {
        Alert.alert('שגיאת התחברות', 'לא הצלחנו להתחבר עם Apple. נסה שוב.');
      }
    } finally {
      setLoading(prev => ({ ...prev, apple: false }));
    }
  };

  return (
    <View style={styles.container}>
      <RText style={styles.title}>או התחבר עם:</RText>
      
      <View style={styles.buttonsContainer}>
        {/* Google Sign-In */}
        <Pressable
          style={[styles.socialButton, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={disabled || loading.google}
        >
            {loading.google ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <RText style={styles.buttonText}>Google</RText>
              </>
            )}
        </Pressable>

        {/* Facebook Sign-In */}
        <Pressable
          style={[styles.socialButton, styles.facebookButton]}
          onPress={handleFacebookSignIn}
          disabled={disabled || loading.facebook}
        >
            {loading.facebook ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-facebook" size={20} color="#fff" />
                <RText style={styles.buttonText}>Facebook</RText>
              </>
            )}
        </Pressable>

        {/* Apple Sign-In (iOS בלבד) */}
        <Pressable
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={disabled || loading.apple}
          >
            {loading.apple ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <RText style={styles.buttonText}>Apple</RText>
              </>
            )}
        </Pressable>
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  title: {
    textAlign: 'center',
    color: colors.subtext,
    marginBottom: 16,
    fontSize: 14,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SocialLoginButtons;
