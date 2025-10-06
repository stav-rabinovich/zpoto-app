// screens/LegacyCleanupScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { 
  scanLegacyData, 
  cleanLegacyData, 
  validatePostCleanup,
  createFinalBackup
} from '../utils/legacy-cleanup';
import ZpButton from '../components/ui/ZpButton';

export default function LegacyCleanupScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleanupResults, setCleanupResults] = useState(null);

  useEffect(() => {
    performScan();
  }, []);

  const performScan = async () => {
    setLoading(true);
    try {
      const results = await scanLegacyData();
      setScanResults(results);
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('שגיאה', 'הסריקה נכשלה: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const performCleanup = async (keysToClean = null) => {
    Alert.alert(
      'ניקוי נתונים ישנים',
      'האם אתה בטוח שברצונך למחוק את הנתונים הישנים? פעולה זו בלתי הפיכה.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'המשך',
          onPress: async () => {
            setLoading(true);
            try {
              // יצירת גיבוי אחרון
              const backup = await createFinalBackup();
              if (!backup.success) {
                Alert.alert('שגיאה', 'לא ניתן ליצור גיבוי: ' + backup.error);
                return;
              }

              // ביצוע הניקוי
              const results = await cleanLegacyData(keysToClean);
              setCleanupResults(results);

              if (results.success) {
                Alert.alert(
                  'הושלם בהצלחה',
                  `${results.removedCount} מפתחות נמחקו.\nגיבוי נוצר במפתח: ${backup.backupKey}`,
                  [
                    {
                      text: 'בדוק תאימות',
                      onPress: () => performValidation()
                    },
                    { text: 'אישור' }
                  ]
                );
                
                // רענון הסריקה
                await performScan();
              } else {
                Alert.alert('שגיאה חלקית', results.message);
              }
            } catch (error) {
              Alert.alert('שגיאה', 'הניקוי נכשל: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const performValidation = async () => {
    setLoading(true);
    try {
      const results = await validatePostCleanup();
      
      let message = '';
      if (results.issues.length > 0) {
        message += 'בעיות:\n' + results.issues.join('\n') + '\n\n';
      }
      if (results.warnings.length > 0) {
        message += 'הערות:\n' + results.warnings.join('\n');
      }

      Alert.alert(
        results.success ? 'בדיקת תאימות עברה' : 'בדיקת תאימות נכשלה',
        message || 'הכל תקין!',
        [{ text: 'אישור' }]
      );
    } catch (error) {
      Alert.alert('שגיאה', 'בדיקת התאימות נכשלה: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDataTypeIcon = (type) => {
    switch (type) {
      case 'array': return 'list-outline';
      case 'object': return 'document-outline';
      case 'string': return 'text-outline';
      default: return 'help-outline';
    }
  };

  const getDataTypeColor = (type) => {
    switch (type) {
      case 'array': return theme.colors.primary;
      case 'object': return theme.colors.secondary;
      case 'string': return theme.colors.warning;
      default: return theme.colors.subtext;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="trash-bin-outline" size={48} color={theme.colors.error} />
        <Text style={styles.title}>ניקוי נתונים ישנים</Text>
        <Text style={styles.subtitle}>
          זיהוי ומחיקת נתוני AsyncStorage ישנים שלא נדרשים יותר
        </Text>
      </View>

      {/* תוצאות סריקה */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="search-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>תוצאות סריקה</Text>
          <TouchableOpacity onPress={performScan} disabled={loading}>
            <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading && !scanResults ? (
          <Text style={styles.loadingText}>סורק נתונים ישנים...</Text>
        ) : scanResults ? (
          <View style={styles.scanResults}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>מפתחות ישנים:</Text>
              <Text style={[styles.summaryValue, { color: scanResults.totalKeys > 0 ? theme.colors.warning : theme.colors.success }]}>
                {scanResults.totalKeys}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>גודל כולל:</Text>
              <Text style={styles.summaryValue}>
                {formatFileSize(scanResults.totalSize)}
              </Text>
            </View>

            {Object.keys(scanResults.data).length > 0 && (
              <View style={styles.dataList}>
                <Text style={styles.dataListTitle}>נתונים שנמצאו:</Text>
                {Object.entries(scanResults.data).map(([key, info]) => (
                  <View key={key} style={styles.dataItem}>
                    <View style={styles.dataItemHeader}>
                      <Ionicons 
                        name={getDataTypeIcon(info.type)} 
                        size={16} 
                        color={getDataTypeColor(info.type)} 
                      />
                      <Text style={styles.dataItemKey}>{key}</Text>
                    </View>
                    <View style={styles.dataItemDetails}>
                      <Text style={styles.dataItemDetail}>
                        {info.type} • {info.itemCount} פריטים • {formatFileSize(info.size)}
                      </Text>
                      {info.error && (
                        <Text style={styles.dataItemError}>שגיאה: {info.error}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.errorText}>לא ניתן לסרוק נתונים</Text>
        )}
      </View>

      {/* פעולות ניקוי */}
      {scanResults && scanResults.totalKeys > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            <Text style={styles.cardTitle}>פעולות ניקוי</Text>
          </View>

          <View style={styles.cleanupActions}>
            <ZpButton
              title="נקה הכל"
              onPress={() => performCleanup()}
              disabled={loading}
              style={styles.dangerButton}
              leftIcon={<Ionicons name="trash-outline" size={18} color="#fff" />}
            />

            <ZpButton
              title="נקה רק גיבויים"
              onPress={() => performCleanup(Object.keys(scanResults.data).filter(key => key.startsWith('backup_')))}
              disabled={loading || !Object.keys(scanResults.data).some(key => key.startsWith('backup_'))}
              style={styles.warningButton}
              leftIcon={<Ionicons name="archive-outline" size={18} color="#fff" />}
            />

            <ZpButton
              title="נקה רק fallback"
              onPress={() => performCleanup(Object.keys(scanResults.data).filter(key => key.startsWith('fallback_')))}
              disabled={loading || !Object.keys(scanResults.data).some(key => key.startsWith('fallback_'))}
              style={styles.warningButton}
              leftIcon={<Ionicons name="cloud-offline-outline" size={18} color="#fff" />}
            />
          </View>
        </View>
      )}

      {/* תוצאות ניקוי */}
      {cleanupResults && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={cleanupResults.success ? "checkmark-circle-outline" : "alert-circle-outline"} 
              size={20} 
              color={cleanupResults.success ? theme.colors.success : theme.colors.error} 
            />
            <Text style={styles.cardTitle}>תוצאות ניקוי</Text>
          </View>

          <View style={styles.cleanupResults}>
            <Text style={[styles.resultText, { color: cleanupResults.success ? theme.colors.success : theme.colors.error }]}>
              {cleanupResults.message}
            </Text>
            
            {cleanupResults.errors.length > 0 && (
              <View style={styles.errorsList}>
                <Text style={styles.errorsTitle}>שגיאות:</Text>
                {cleanupResults.errors.map((error, index) => (
                  <Text key={index} style={styles.errorItem}>
                    • {error.key}: {error.error}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* כלים נוספים */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="build-outline" size={20} color={theme.colors.secondary} />
          <Text style={styles.cardTitle}>כלים נוספים</Text>
        </View>

        <View style={styles.additionalTools}>
          <ZpButton
            title="בדוק תאימות"
            onPress={performValidation}
            disabled={loading}
            style={styles.secondaryButton}
            leftIcon={<Ionicons name="checkmark-done-outline" size={18} color="#fff" />}
          />

          <ZpButton
            title="צור גיבוי אחרון"
            onPress={async () => {
              const result = await createFinalBackup();
              Alert.alert(
                result.success ? 'הושלם' : 'שגיאה',
                result.success ? 
                  `גיבוי נוצר: ${result.backupKey}\n${result.itemCount} פריטים, ${formatFileSize(result.size)}` :
                  result.error
              );
            }}
            disabled={loading}
            style={styles.secondaryButton}
            leftIcon={<Ionicons name="save-outline" size={18} color="#fff" />}
          />
        </View>
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
      flex: 1,
    },
    loadingText: {
      textAlign: 'center',
      color: colors.subtext,
      fontStyle: 'italic',
    },
    errorText: {
      textAlign: 'center',
      color: colors.error,
    },
    scanResults: {
      gap: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    dataList: {
      gap: spacing.sm,
    },
    dataListTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    dataItem: {
      backgroundColor: colors.bg,
      padding: spacing.md,
      borderRadius: borderRadii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dataItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    dataItemKey: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginLeft: spacing.xs,
    },
    dataItemDetails: {
      gap: spacing.xs,
    },
    dataItemDetail: {
      fontSize: 12,
      color: colors.subtext,
    },
    dataItemError: {
      fontSize: 12,
      color: colors.error,
    },
    cleanupActions: {
      gap: spacing.md,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    warningButton: {
      backgroundColor: colors.warning,
    },
    secondaryButton: {
      backgroundColor: colors.secondary,
    },
    cleanupResults: {
      gap: spacing.md,
    },
    resultText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    errorsList: {
      gap: spacing.xs,
    },
    errorsTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.error,
    },
    errorItem: {
      fontSize: 12,
      color: colors.error,
      paddingLeft: spacing.sm,
    },
    additionalTools: {
      gap: spacing.md,
    },
  });
}
