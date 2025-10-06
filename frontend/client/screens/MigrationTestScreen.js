// screens/MigrationTestScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { 
  runAllTests, 
  runMigrationTests, 
  runPerformanceTests, 
  runIntegrationTests, 
  quickTest 
} from '../tests/migration-regression';
import { getFallbackStats, clearAllFallbackData } from '../services/fallback';
import { checkLocalData, deleteAllBackups } from '../services/migration';
import ZpButton from '../components/ui/ZpButton';

export default function MigrationTestScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const [localData, fallbackStats] = await Promise.all([
        checkLocalData(),
        getFallbackStats()
      ]);

      setSystemInfo({
        localData: localData.hasData,
        localDataCounts: localData.counts,
        fallbackStats: fallbackStats.success ? fallbackStats.data : null
      });
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const runTest = async (testType) => {
    setLoading(true);
    try {
      let results;
      
      switch (testType) {
        case 'quick':
          results = await quickTest();
          break;
        case 'migration':
          results = await runMigrationTests();
          break;
        case 'performance':
          results = await runPerformanceTests();
          break;
        case 'integration':
          results = await runIntegrationTests();
          break;
        case 'all':
          results = await runAllTests();
          break;
        default:
          throw new Error('Unknown test type');
      }
      
      setTestResults({ type: testType, results, timestamp: new Date() });
      await loadSystemInfo(); // רענון מידע המערכת
      
    } catch (error) {
      console.error('Test failed:', error);
      Alert.alert('שגיאה', `הבדיקה נכשלה: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async (dataType) => {
    Alert.alert(
      'מחיקת נתונים',
      `האם אתה בטוח שברצונך למחוק ${getDataTypeText(dataType)}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              let result;
              switch (dataType) {
                case 'fallback':
                  result = await clearAllFallbackData();
                  break;
                case 'backups':
                  result = await deleteAllBackups();
                  break;
                default:
                  throw new Error('Unknown data type');
              }
              
              if (result.success) {
                Alert.alert('הושלם', result.message);
                await loadSystemInfo();
              } else {
                Alert.alert('שגיאה', result.error);
              }
            } catch (error) {
              Alert.alert('שגיאה', error.message);
            }
          }
        }
      ]
    );
  };

  const getDataTypeText = (dataType) => {
    switch (dataType) {
      case 'fallback': return 'כל נתוני ה-Fallback';
      case 'backups': return 'כל הגיבויים';
      default: return 'נתונים';
    }
  };

  const getTestStatusIcon = (results) => {
    if (!results) return 'help-outline';
    
    if (results.type === 'quick') {
      return results.results.success ? 'checkmark-circle' : 'close-circle';
    }
    
    if (results.results.overallPassed !== undefined) {
      return results.results.overallPassed ? 'checkmark-circle' : 'close-circle';
    }
    
    return results.results.failed === 0 ? 'checkmark-circle' : 'close-circle';
  };

  const getTestStatusColor = (results) => {
    if (!results) return theme.colors.subtext;
    
    if (results.type === 'quick') {
      return results.results.success ? theme.colors.success : theme.colors.error;
    }
    
    if (results.results.overallPassed !== undefined) {
      return results.results.overallPassed ? theme.colors.success : theme.colors.error;
    }
    
    return results.results.failed === 0 ? theme.colors.success : theme.colors.error;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="flask-outline" size={48} color={theme.colors.primary} />
        <Text style={styles.title}>בדיקות מיגרציה</Text>
        <Text style={styles.subtitle}>
          בדיקות אוטומטיות לוידוא תקינות המיגרציה והמערכת
        </Text>
      </View>

      {/* מידע מערכת */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>מידע מערכת</Text>
        </View>

        {systemInfo && (
          <View style={styles.systemInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>נתונים מקומיים:</Text>
              <Text style={[styles.infoValue, { color: systemInfo.localData ? theme.colors.warning : theme.colors.success }]}>
                {systemInfo.localData ? 'יש' : 'אין'}
              </Text>
            </View>

            {systemInfo.localData && systemInfo.localDataCounts && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoSubLabel}>הזמנות:</Text>
                  <Text style={styles.infoValue}>{systemInfo.localDataCounts.bookings}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoSubLabel}>רכבים:</Text>
                  <Text style={styles.infoValue}>{systemInfo.localDataCounts.vehicles}</Text>
                </View>
              </>
            )}

            {systemInfo.fallbackStats && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>פעולות ממתינות:</Text>
                  <Text style={[styles.infoValue, { color: systemInfo.fallbackStats.pendingActionsCount > 0 ? theme.colors.warning : theme.colors.success }]}>
                    {systemInfo.fallbackStats.pendingActionsCount}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>פריטים במטמון:</Text>
                  <Text style={styles.infoValue}>{systemInfo.fallbackStats.cachedItemsCount}</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* בדיקות */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="play-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>הרצת בדיקות</Text>
        </View>

        <View style={styles.testButtons}>
          <ZpButton
            title="בדיקה מהירה"
            onPress={() => runTest('quick')}
            disabled={loading}
            style={styles.testButton}
            leftIcon={<Ionicons name="flash-outline" size={18} color="#fff" />}
          />

          <ZpButton
            title="בדיקות מיגרציה"
            onPress={() => runTest('migration')}
            disabled={loading}
            style={styles.testButton}
            leftIcon={<Ionicons name="swap-horizontal-outline" size={18} color="#fff" />}
          />

          <ZpButton
            title="בדיקות ביצועים"
            onPress={() => runTest('performance')}
            disabled={loading}
            style={styles.testButton}
            leftIcon={<Ionicons name="speedometer-outline" size={18} color="#fff" />}
          />

          <ZpButton
            title="בדיקות אינטגרציה"
            onPress={() => runTest('integration')}
            disabled={loading}
            style={styles.testButton}
            leftIcon={<Ionicons name="link-outline" size={18} color="#fff" />}
          />

          <ZpButton
            title="כל הבדיקות"
            onPress={() => runTest('all')}
            disabled={loading}
            style={[styles.testButton, styles.primaryButton]}
            leftIcon={<Ionicons name="checkmark-done-outline" size={18} color="#fff" />}
          />
        </View>
      </View>

      {/* תוצאות */}
      {testResults && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={getTestStatusIcon(testResults)} 
              size={20} 
              color={getTestStatusColor(testResults)} 
            />
            <Text style={styles.cardTitle}>תוצאות בדיקה</Text>
          </View>

          <View style={styles.results}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                {getTestTypeText(testResults.type)}
              </Text>
              <Text style={styles.resultTime}>
                {testResults.timestamp.toLocaleTimeString('he-IL')}
              </Text>
            </View>

            {renderTestResults(testResults.results, theme)}
          </View>
        </View>
      )}

      {/* פעולות ניקוי */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          <Text style={styles.cardTitle}>ניקוי נתונים</Text>
        </View>

        <View style={styles.cleanupButtons}>
          <ZpButton
            title="נקה נתוני Fallback"
            onPress={() => clearData('fallback')}
            style={styles.dangerButton}
            leftIcon={<Ionicons name="cloud-offline-outline" size={18} color="#fff" />}
          />

          <ZpButton
            title="נקה גיבויים"
            onPress={() => clearData('backups')}
            style={styles.dangerButton}
            leftIcon={<Ionicons name="archive-outline" size={18} color="#fff" />}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function getTestTypeText(type) {
  switch (type) {
    case 'quick': return 'בדיקה מהירה';
    case 'migration': return 'בדיקות מיגרציה';
    case 'performance': return 'בדיקות ביצועים';
    case 'integration': return 'בדיקות אינטגרציה';
    case 'all': return 'כל הבדיקות';
    default: return 'בדיקה';
  }
}

function renderTestResults(results, theme) {
  if (results.success !== undefined) {
    // Quick test results
    return (
      <View style={{ padding: 12, backgroundColor: results.success ? '#E8F5E8' : '#FFE8E8', borderRadius: 8 }}>
        <Text style={{ color: results.success ? '#2E7D32' : '#D32F2F', fontWeight: '600' }}>
          {results.success ? '✅ הבדיקה עברה בהצלחה' : '❌ הבדיקה נכשלה'}
        </Text>
        {results.error && (
          <Text style={{ color: '#D32F2F', marginTop: 4 }}>
            שגיאה: {results.error}
          </Text>
        )}
      </View>
    );
  }

  if (results.migration) {
    // All tests results
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '600' }}>מיגרציה:</Text>
          <Text style={{ color: results.migration.failed === 0 ? theme.colors.success : theme.colors.error }}>
            {results.migration.passed}/{results.migration.tests.length}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '600' }}>אינטגרציה:</Text>
          <Text style={{ color: results.integration.failed === 0 ? theme.colors.success : theme.colors.error }}>
            {results.integration.passed}/{results.integration.tests.length}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '600' }}>זמן כולל:</Text>
          <Text>{results.totalTime}ms</Text>
        </View>
      </View>
    );
  }

  if (results.tests) {
    // Individual test results
    return (
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontWeight: '600' }}>עברו:</Text>
          <Text style={{ color: theme.colors.success }}>{results.passed}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontWeight: '600' }}>נכשלו:</Text>
          <Text style={{ color: theme.colors.error }}>{results.failed}</Text>
        </View>
        
        {results.tests.filter(test => !test.passed).map((test, index) => (
          <View key={index} style={{ backgroundColor: '#FFE8E8', padding: 8, borderRadius: 4 }}>
            <Text style={{ color: '#D32F2F', fontWeight: '600' }}>{test.name}</Text>
            {test.error && (
              <Text style={{ color: '#D32F2F', fontSize: 12 }}>{test.error}</Text>
            )}
          </View>
        ))}
      </View>
    );
  }

  return null;
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
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.subtext,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginLeft: spacing.sm,
    },
    systemInfo: {
      gap: spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
    infoSubLabel: {
      fontSize: 14,
      color: colors.subtext,
      paddingLeft: spacing.md,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    testButtons: {
      gap: spacing.md,
    },
    testButton: {
      backgroundColor: colors.secondary,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    cleanupButtons: {
      gap: spacing.md,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    results: {
      gap: spacing.md,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    resultTime: {
      fontSize: 14,
      color: colors.subtext,
    },
  });
}
