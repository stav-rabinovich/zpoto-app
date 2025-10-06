// screens/MigrationScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { checkLocalData, migrateAllData, backupLocalData, cleanupLocalData } from '../services/migration';
import ZpButton from '../components/ui/ZpButton';

export default function MigrationScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { migrationStatus, startMigration, skipMigration } = useAuth();

  const [localDataInfo, setLocalDataInfo] = useState(null);
  const [migrationProgress, setMigrationProgress] = useState(null);
  const [backupKey, setBackupKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLocalDataInfo();
  }, []);

  const checkLocalDataInfo = async () => {
    setLoading(true);
    try {
      const info = await checkLocalData();
      setLocalDataInfo(info);
    } catch (error) {
      console.error('Failed to check local data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    Alert.alert(
      'העברת נתונים',
      'האם אתה בטוח שברצונך להעביר את כל הנתונים המקומיים לשרת? פעולה זו תחליף את הנתונים הקיימים בשרת.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'המשך',
          onPress: async () => {
            // יצירת גיבוי לפני ההעברה
            const backup = await backupLocalData();
            if (backup.success) {
              setBackupKey(backup.backupKey);
            }

            // התחלת המיגרציה
            const result = await startMigration((progress) => {
              setMigrationProgress(progress);
            });

            if (result.success) {
              Alert.alert(
                'הושלם בהצלחה!',
                `הנתונים הועברו בהצלחה:\n• ${result.migrated.bookings} הזמנות\n• ${result.migrated.vehicles} רכבים\n• פרופיל: ${result.migrated.profile ? 'כן' : 'לא'}`,
                [
                  {
                    text: 'נקה נתונים מקומיים',
                    onPress: () => handleCleanup()
                  },
                  {
                    text: 'השאר נתונים מקומיים',
                    style: 'cancel'
                  }
                ]
              );
            } else {
              Alert.alert(
                'שגיאה בהעברה',
                `חלק מהנתונים לא הועברו:\n${result.errors.join('\n')}\n\nהנתונים המקומיים נשמרו בבטחה.`
              );
            }

            // רענון מידע נתונים מקומיים
            await checkLocalDataInfo();
          }
        }
      ]
    );
  };

  const handleSkip = () => {
    Alert.alert(
      'דילוג על העברה',
      'האם אתה בטוח שברצונך לדלג על העברת הנתונים? הנתונים המקומיים יישארו במכשיר אבל לא יועברו לשרת.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'דלג',
          onPress: () => {
            skipMigration();
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleCleanup = async () => {
    Alert.alert(
      'ניקוי נתונים מקומיים',
      'האם אתה בטוח שברצונך למחוק את כל הנתונים המקומיים? פעולה זו בלתי הפיכה.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            const result = await cleanupLocalData();
            if (result.success) {
              Alert.alert('נוקה בהצלחה', 'כל הנתונים המקומיים נמחקו.');
              await checkLocalDataInfo();
            } else {
              Alert.alert('שגיאה', 'לא ניתן למחוק את הנתונים המקומיים.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>בודק נתונים מקומיים...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="sync-outline" size={48} color={theme.colors.primary} />
        <Text style={styles.title}>העברת נתונים לשרת</Text>
        <Text style={styles.subtitle}>
          העבר את הנתונים המקומיים שלך לשרת לשמירה מאובטחת וגישה ממספר מכשירים
        </Text>
      </View>

      {/* מידע על נתונים מקומיים */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>נתונים מקומיים במכשיר</Text>
        </View>

        {localDataInfo?.hasData ? (
          <View style={styles.dataInfo}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>הזמנות:</Text>
              <Text style={styles.dataValue}>{localDataInfo.counts.bookings}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>רכבים:</Text>
              <Text style={styles.dataValue}>{localDataInfo.counts.vehicles}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>פרופיל:</Text>
              <Text style={styles.dataValue}>{localDataInfo.counts.profile ? 'כן' : 'לא'}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>אין נתונים מקומיים להעברה</Text>
        )}
      </View>

      {/* התקדמות מיגרציה */}
      {migrationStatus.inProgress && migrationProgress && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ActivityIndicator size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>מעביר נתונים...</Text>
          </View>
          
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              שלב נוכחי: {getProgressStepText(migrationProgress.step)}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${migrationProgress.progress || 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercent}>{migrationProgress.progress || 0}%</Text>
          </View>
        </View>
      )}

      {/* פעולות */}
      <View style={styles.actions}>
        {localDataInfo?.hasData && !migrationStatus.completed ? (
          <ZpButton
            title="התחל העברה"
            onPress={handleMigration}
            disabled={migrationStatus.inProgress}
            leftIcon={<Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
            style={styles.primaryButton}
          />
        ) : null}

        {localDataInfo?.hasData && migrationStatus.completed ? (
          <ZpButton
            title="נקה נתונים מקומיים"
            onPress={handleCleanup}
            leftIcon={<Ionicons name="trash-outline" size={18} color="#fff" />}
            style={styles.dangerButton}
          />
        ) : null}

        <ZpButton
          title="דלג על העברה"
          onPress={handleSkip}
          style={styles.secondaryButton}
          textStyle={styles.secondaryButtonText}
        />
      </View>

      {/* גיבוי */}
      {backupKey && (
        <View style={styles.backupInfo}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.success} />
          <Text style={styles.backupText}>
            נוצר גיבוי בטוח של הנתונים המקומיים
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getProgressStepText(step) {
  switch (step) {
    case 'profile':
      return 'מעביר פרופיל משתמש';
    case 'vehicles':
      return 'מעביר רכבים';
    case 'bookings':
      return 'מעביר הזמנות';
    case 'cleanup':
      return 'מסיים עיבוד';
    case 'complete':
      return 'הושלם';
    default:
      return 'מתחיל...';
  }
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
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacing.md,
      color: colors.subtext,
      fontSize: 16,
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
    dataInfo: {
      gap: spacing.sm,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dataLabel: {
      fontSize: 16,
      color: colors.text,
    },
    dataValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    noData: {
      fontSize: 16,
      color: colors.subtext,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    progressInfo: {
      gap: spacing.sm,
    },
    progressText: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    progressPercent: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
    },
    actions: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    backupInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
      gap: spacing.xs,
    },
    backupText: {
      fontSize: 14,
      color: colors.success,
    },
  });
}
