import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
// הוסרנו AsyncStorage - עובדים רק מהשרת
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import ZpButton from '../components/ui/ZpButton';
import { clearAuthData, freshLogin, checkAuthStatus, quickAuthFix } from '../utils/auth-fix';

export default function DebugScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { user, token, isAuthenticated } = useAuth();
  
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('user');
      const allKeys = await AsyncStorage.getAllKeys();
      
      setDebugInfo({
        contextToken: token,
        contextUser: user,
        contextAuthenticated: isAuthenticated,
        storedToken: storedToken,
        storedUser: storedUser ? JSON.parse(storedUser) : null,
        allStorageKeys: allKeys,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to load debug info:', error);
    }
  };

  const testAPI = async (endpoint, method = 'GET') => {
    setLoading(true);
    try {
      console.log(`🧪 Testing ${method} ${endpoint}`);
      
      const response = await api({
        method,
        url: endpoint,
      });
      
      const result = {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
      
      setTestResults(prev => ({
        ...prev,
        [endpoint]: result
      }));
      
      Alert.alert('✅ הצלחה', `${method} ${endpoint}\nStatus: ${response.status}`);
      
    } catch (error) {
      const result = {
        success: false,
        status: error.response?.status,
        data: error.response?.data,
        error: error.message
      };
      
      setTestResults(prev => ({
        ...prev,
        [endpoint]: result
      }));
      
      Alert.alert('❌ שגיאה', `${method} ${endpoint}\nError: ${error.response?.status || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = async () => {
    Alert.alert(
      'מחיקת נתונים',
      'האם אתה בטוח שברצונך למחוק את כל נתוני האחסון?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await loadDebugInfo();
              Alert.alert('הושלם', 'כל הנתונים נמחקו');
            } catch (error) {
              Alert.alert('שגיאה', error.message);
            }
          }
        }
      ]
    );
  };

  const loginTestUser = async () => {
    setLoading(true);
    try {
      const result = await freshLogin();
      
      if (result.success) {
        await loadDebugInfo();
        Alert.alert('✅ התחברות הצליחה', `המשתמש ${result.user.email} התחבר בהצלחה`);
      } else {
        Alert.alert('❌ התחברות נכשלה', result.error);
      }
    } catch (error) {
      Alert.alert('❌ שגיאה', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runQuickFix = async () => {
    setLoading(true);
    try {
      const result = await quickAuthFix();
      
      if (result.success) {
        await loadDebugInfo();
        Alert.alert('✅ תיקון הושלם', result.message);
      } else {
        Alert.alert('❌ תיקון נכשל', result.error);
      }
    } catch (error) {
      Alert.alert('❌ שגיאה', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runAuthCheck = async () => {
    setLoading(true);
    try {
      const status = await checkAuthStatus();
      
      let message = `טוקן קיים: ${status.hasToken ? '✅' : '❌'}\n`;
      message += `משתמש קיים: ${status.hasUser ? '✅' : '❌'}\n`;
      message += `שרת זמין: ${status.serverReachable ? '✅' : '❌'}\n`;
      message += `טוקן תקין: ${status.tokenValid ? '✅' : '❌'}\n`;
      message += `API עובד: ${status.apiWorking ? '✅' : '❌'}`;
      
      if (status.lastError) {
        message += `\n\nשגיאה אחרונה: ${status.lastError}`;
      }
      
      Alert.alert('מצב אימות', message);
    } catch (error) {
      Alert.alert('❌ שגיאה', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="bug-outline" size={48} color={theme.colors.primary} />
        <Text style={styles.title}>מסך דיבוג</Text>
        <Text style={styles.subtitle}>בדיקת אימות ו-API</Text>
      </View>

      {/* מידע חשבון */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>מידע AuthContext</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>מחובר:</Text>
          <Text style={[styles.value, { color: debugInfo.contextAuthenticated ? theme.colors.success : theme.colors.error }]}>
            {debugInfo.contextAuthenticated ? '✅ כן' : '❌ לא'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>טוקן בזיכרון:</Text>
          <Text style={styles.value}>
            {debugInfo.contextToken ? `${debugInfo.contextToken.substring(0, 20)}...` : 'אין'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>משתמש:</Text>
          <Text style={styles.value}>
            {debugInfo.contextUser?.email || 'אין'}
          </Text>
        </View>
      </View>

      {/* נתונים שמורים */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>נתונים שמורים</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>טוקן שמור:</Text>
          <Text style={styles.value}>
            {debugInfo.storedToken ? `${debugInfo.storedToken.substring(0, 20)}...` : 'אין'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>משתמש שמור:</Text>
          <Text style={styles.value}>
            {debugInfo.storedUser?.email || 'אין'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>מפתחות באחסון:</Text>
          <Text style={styles.value}>
            {debugInfo.allStorageKeys?.length || 0}
          </Text>
        </View>
      </View>

      {/* תיקון מהיר */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚀 תיקון מהיר</Text>
        
        <ZpButton
          title="תקן בעיות אימות אוטומטית"
          onPress={runQuickFix}
          disabled={loading}
          style={[styles.testButton, { backgroundColor: '#FF6B35' }]}
          leftIcon={<Ionicons name="flash-outline" size={18} color="#fff" />}
        />
        
        <ZpButton
          title="בדוק מצב אימות נוכחי"
          onPress={runAuthCheck}
          disabled={loading}
          style={[styles.testButton, { backgroundColor: theme.colors.warning }]}
          leftIcon={<Ionicons name="search-outline" size={18} color="#fff" />}
        />
      </View>

      {/* פעולות בדיקה */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>בדיקות API</Text>
        
        <ZpButton
          title="בדוק /health"
          onPress={() => testAPI('/health')}
          disabled={loading}
          style={styles.testButton}
          leftIcon={<Ionicons name="pulse-outline" size={18} color="#fff" />}
        />
        
        <ZpButton
          title="בדוק /api/bookings"
          onPress={() => testAPI('/api/bookings')}
          disabled={loading}
          style={styles.testButton}
          leftIcon={<Ionicons name="calendar-outline" size={18} color="#fff" />}
        />
        
        <ZpButton
          title="בדוק /api/profile"
          onPress={() => testAPI('/api/profile')}
          disabled={loading}
          style={styles.testButton}
          leftIcon={<Ionicons name="person-outline" size={18} color="#fff" />}
        />
        
        <ZpButton
          title="התחבר כמשתמש בדיקה"
          onPress={loginTestUser}
          disabled={loading}
          style={[styles.testButton, { backgroundColor: theme.colors.success }]}
          leftIcon={<Ionicons name="log-in-outline" size={18} color="#fff" />}
        />
      </View>

      {/* תוצאות בדיקה */}
      {Object.keys(testResults).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>תוצאות בדיקות</Text>
          {Object.entries(testResults).map(([endpoint, result]) => (
            <View key={endpoint} style={styles.resultItem}>
              <Text style={styles.resultEndpoint}>{endpoint}</Text>
              <Text style={[styles.resultStatus, { 
                color: result.success ? theme.colors.success : theme.colors.error 
              }]}>
                {result.success ? `✅ ${result.status}` : `❌ ${result.status || 'Network Error'}`}
              </Text>
              {result.error && (
                <Text style={styles.resultError}>{result.error}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* פעולות ניהול */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>פעולות ניהול</Text>
        
        <ZpButton
          title="רענן מידע"
          onPress={loadDebugInfo}
          disabled={loading}
          style={[styles.testButton, { backgroundColor: theme.colors.secondary }]}
          leftIcon={<Ionicons name="refresh-outline" size={18} color="#fff" />}
        />
        
        <ZpButton
          title="מחק כל הנתונים"
          onPress={clearStorage}
          disabled={loading}
          style={[styles.testButton, { backgroundColor: theme.colors.error }]}
          leftIcon={<Ionicons name="trash-outline" size={18} color="#fff" />}
        />
      </View>
    </ScrollView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.md,
    },
    subtitle: {
      fontSize: 16,
      color: colors.subtext,
      marginTop: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    value: {
      fontSize: 14,
      color: colors.subtext,
      flex: 1,
      textAlign: 'right',
    },
    testButton: {
      marginBottom: spacing.md,
    },
    resultItem: {
      marginBottom: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: borderRadii.sm,
    },
    resultEndpoint: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    resultStatus: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    resultError: {
      fontSize: 12,
      color: colors.error,
      marginTop: spacing.xs,
    },
  });
}
